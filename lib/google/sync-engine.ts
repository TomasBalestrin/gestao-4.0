import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/google/oauth";
import { listFilesInFolder, getDocText } from "@/lib/google/drive-client";
import { extractClientName } from "@/lib/openai/extract-client-name";
import { analyzeCall } from "@/lib/openai/analyze-call";
import { matchLeadByClientName } from "@/lib/calls/lead-matcher";
import { logEvent } from "@/lib/audit/logger";

import type { Database, Json } from "@/lib/database.types";

export interface SyncSummary {
  closer_id: string;
  processed: number;
  matched: number;
  unmatched: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// Sincroniza arquivos novos do Drive do closer e processa via AI.
// Idempotente: se ja existe call_analyses com (closer_id, google_file_id),
// pula. Status processing nao bloqueia re-tentativa (cron concorrente pode
// re-tentar registros failed/orphan).
export async function syncCloserCalls(closerId: string): Promise<SyncSummary> {
  const summary: SyncSummary = {
    closer_id: closerId,
    processed: 0,
    matched: 0,
    unmatched: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("google_drive_integrations")
    .select("*")
    .eq("user_id", closerId)
    .maybeSingle();

  if (!integration || integration.status !== "connected") {
    summary.errors.push("Integration ausente ou nao conectada");
    return summary;
  }
  if (!integration.folder_id) {
    summary.errors.push("folder_id nao configurado");
    return summary;
  }
  if (!integration.refresh_token) {
    summary.errors.push("refresh_token ausente, reconecte o Drive");
    return summary;
  }

  // Garante access_token valido.
  let accessToken = integration.access_token ?? "";
  const expiresAtMs = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;
  if (!accessToken || expiresAtMs - Date.now() < 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(integration.refresh_token);
      accessToken = refreshed.access_token;
      await admin
        .from("google_drive_integrations")
        .update({
          access_token: refreshed.access_token,
          token_expires_at: new Date(
            Date.now() + refreshed.expires_in * 1000
          ).toISOString(),
          last_refreshed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", integration.id);
    } catch (err) {
      await admin
        .from("google_drive_integrations")
        .update({
          status: "expired_token",
          last_error: err instanceof Error ? err.message : "refresh falhou",
        })
        .eq("id", integration.id);
      summary.errors.push("refresh token falhou; integration marcada expired");
      return summary;
    }
  }

  // Lista arquivos novos na pasta.
  let files: Awaited<ReturnType<typeof listFilesInFolder>>;
  try {
    files = await listFilesInFolder({
      accessToken,
      folderId: integration.folder_id,
      mimeTypes: integration.file_mime_types ?? [
        "application/vnd.google-apps.document",
      ],
      modifiedAfter: integration.last_synced_at,
    });
  } catch (err) {
    summary.errors.push(
      `listFilesInFolder: ${err instanceof Error ? err.message : String(err)}`
    );
    return summary;
  }

  // Filtra por palavras-chave (case-insensitive) no nome do arquivo.
  const keywords = (integration.file_keywords ?? []).map((k) => k.toLowerCase());
  const matchingFiles = files.filter((f) => {
    if (keywords.length === 0) return true;
    const lower = f.name.toLowerCase();
    return keywords.some((k) => lower.includes(k));
  });

  for (const file of matchingFiles) {
    try {
      // Idempotencia: pula se ja existe analise pra esse arquivo.
      const { data: existing } = await admin
        .from("call_analyses")
        .select("id, status")
        .eq("closer_id", closerId)
        .eq("google_file_id", file.id)
        .maybeSingle();
      if (existing && existing.status !== "failed") {
        summary.skipped += 1;
        continue;
      }

      const result = await processSingleFile({
        admin,
        closerId,
        accessToken,
        file,
        existingId: existing?.id ?? null,
      });

      summary.processed += 1;
      if (result === "matched") summary.matched += 1;
      else if (result === "unmatched") summary.unmatched += 1;
    } catch (err) {
      summary.failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`${file.name}: ${msg}`);
      console.error("[sync-engine] file failed", file.id, err);
    }
  }

  await admin
    .from("google_drive_integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", integration.id);

  return summary;
}

async function processSingleFile(args: {
  admin: SupabaseClient<Database>;
  closerId: string;
  accessToken: string;
  file: {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
  };
  existingId: string | null;
}): Promise<"matched" | "unmatched"> {
  const { admin, closerId, accessToken, file, existingId } = args;

  // Upsert pra processing (ja reserva o slot pra evitar concorrencia).
  let analysisId = existingId;
  if (!analysisId) {
    const { data: inserted, error } = await admin
      .from("call_analyses")
      .insert({
        closer_id: closerId,
        google_file_id: file.id,
        google_file_name: file.name,
        google_file_modified_at: file.modifiedTime,
        status: "processing",
      })
      .select("id")
      .single();
    if (error || !inserted) {
      throw new Error(`insert call_analysis: ${error?.message ?? "no id"}`);
    }
    analysisId = inserted.id;
  } else {
    await admin
      .from("call_analyses")
      .update({
        status: "processing",
        error_message: null,
        google_file_name: file.name,
        google_file_modified_at: file.modifiedTime,
      })
      .eq("id", analysisId);
  }

  try {
    // 1. Baixa texto do Doc.
    const transcription = await getDocText({ accessToken, fileId: file.id });
    if (!transcription || transcription.trim().length < 50) {
      await admin
        .from("call_analyses")
        .update({
          status: "failed",
          error_message: "Transcricao vazia ou muito curta",
          transcription_text: transcription,
        })
        .eq("id", analysisId);
      throw new Error("transcricao vazia ou curta demais");
    }

    // 2. Extrai nome do cliente.
    const nameExtraction = await extractClientName(transcription);

    // 3. Analise estruturada.
    const analysis = await analyzeCall({
      transcription,
      clientName: nameExtraction.client_name,
    });

    // 4. Match com lead.
    const match = await matchLeadByClientName({
      supabaseAdmin: admin,
      closerId,
      clientName: nameExtraction.client_name,
    });

    const totalTokens =
      (nameExtraction.tokens_used ?? 0) + (analysis.tokens_used ?? 0);

    const finalStatus = match.lead_id ? "matched" : "unmatched";

    await admin
      .from("call_analyses")
      .update({
        transcription_text: transcription,
        client_name_extracted: nameExtraction.client_name,
        call_score: analysis.nota,
        analysis_json: analysis.analysis as unknown as Json,
        lead_id: match.lead_id,
        tokens_used: totalTokens,
        status: finalStatus,
        error_message: null,
      })
      .eq("id", analysisId);

    await logEvent({
      entityType: "call_analysis",
      entityId: analysisId,
      eventType:
        finalStatus === "matched"
          ? "call_analysis_linked"
          : "call_analysis_unmatched",
      userId: closerId,
      metadata: {
        google_file_id: file.id,
        client_name: nameExtraction.client_name,
        call_score: analysis.nota,
        match_reason: match.reason,
        candidates_count: match.candidates_count,
        tokens_used: totalTokens,
      },
    });

    return finalStatus;
  } catch (err) {
    await admin
      .from("call_analyses")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("id", analysisId);
    throw err;
  }
}
