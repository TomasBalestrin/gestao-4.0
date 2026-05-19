import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage, MetaApiError } from "@/lib/instagram/graph-client";
import { getInstagramEnv } from "@/lib/instagram/env";
import {
  ApiError,
  badRequest,
  errorResponse,
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { leadId: string };
}

const sendSchema = z.object({
  text: z.string().min(1, "texto obrigatorio").max(1000),
});

// POST /api/chats/instagram/leads/[leadId]/send
// Body: { text }
// Envia texto via Meta. Bloqueia se a janela 24h expirou.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    if (!getInstagramEnv()) {
      return errorResponse("CONFLICT", "Instagram nao configurado", undefined);
    }
    const { user, profile } = await requireAuth();
    const admin = createAdminClient();

    const body = await req.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    // Resolve thread + instancia.
    const { data: thread } = await admin
      .from("ig_threads")
      .select(
        `id, ig_sender_psid, window_expires_at,
         instance:ig_instances(id, funil_id, ig_user_id, access_token, status)`
      )
      .eq("lead_id", params.leadId)
      .maybeSingle();
    if (!thread) return notFound("Thread nao encontrada pra esse lead");

    const instance = thread.instance as unknown as {
      id: string;
      funil_id: string;
      ig_user_id: string;
      access_token: string;
      status: string;
    } | null;
    if (!instance) return notFound("Instancia nao encontrada");

    if (instance.status !== "connected") {
      return errorResponse(
        "BUSINESS_RULE",
        "Instancia Instagram nao esta conectada"
      );
    }

    // Permissao: admin OU membro do funil.
    if (profile.role !== "admin") {
      const { data: membership } = await admin
        .from("user_funis")
        .select("user_id")
        .eq("funil_id", instance.funil_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership) return forbidden("sem permissao");
    }

    // Guard da janela 24h.
    const now = Date.now();
    const expiresMs = thread.window_expires_at
      ? new Date(thread.window_expires_at).getTime()
      : 0;
    if (!expiresMs || expiresMs <= now) {
      return errorResponse(
        "BUSINESS_RULE",
        "Janela de 24h expirada. Aguarde o lead responder pra reabrir."
      );
    }

    // Chama Meta.
    let metaMessageId: string | null = null;
    let failedReason: string | null = null;
    try {
      const resp = await sendTextMessage({
        igUserId: instance.ig_user_id,
        accessToken: instance.access_token,
        recipientPsid: thread.ig_sender_psid,
        text: parsed.data.text,
      });
      metaMessageId = resp.message_id;
    } catch (err) {
      if (err instanceof MetaApiError) {
        failedReason = err.meta.message;
      } else {
        failedReason = (err as Error).message;
      }
    }

    // Persiste a mensagem (mesmo se falhou, pra historico).
    const igTimestamp = new Date().toISOString();
    const { data: msg, error } = await admin
      .from("ig_messages")
      .insert({
        thread_id: thread.id,
        meta_message_id: metaMessageId,
        direction: "outbound",
        from_me: true,
        content_type: "text",
        text: parsed.data.text,
        ig_timestamp: igTimestamp,
        sent_by_user_id: user.id,
        failed_reason: failedReason,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[ig/send] insert", error);
      throw new ApiError("INTERNAL", "Falha ao salvar mensagem");
    }

    if (failedReason) {
      return errorResponse("BUSINESS_RULE", failedReason, { message: msg });
    }

    // Atualiza thread (last_message preview).
    await admin
      .from("ig_threads")
      .update({
        last_message_at: igTimestamp,
        last_message_preview: parsed.data.text.slice(0, 140),
      })
      .eq("id", thread.id);

    return ok({ message: msg });
  } catch (err) {
    return handleApiError(err, "POST /api/chats/instagram/leads/[leadId]/send");
  }
}
