import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleDriveConfigSchema } from "@/lib/schemas/google-drive";
import { logEvent } from "@/lib/audit/logger";
import { canRecordCalls } from "@/lib/utils/permissions";
import {
  badRequest,
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

import type { GoogleDriveIntegrationPublic } from "@/types/domain";

// GET /api/google/integrations/me
// Retorna a integration do user logado (sem tokens).
export async function GET(_req: NextRequest) {
  try {
    const { profile } = await requireAuth();
    if (!canRecordCalls(profile.role)) {
      return forbidden("Apenas closers tem integration");
    }

    const admin = createAdminClient();
    const { data } = await admin
      .from("google_drive_integrations")
      .select(
        "id, user_id, google_email, token_expires_at, folder_id, folder_name, file_keywords, file_mime_types, status, last_synced_at, last_refreshed_at, last_error, created_at, updated_at"
      )
      .eq("user_id", profile.id)
      .maybeSingle();

    return ok<{ integration: GoogleDriveIntegrationPublic | null }>({
      integration: (data ?? null) as GoogleDriveIntegrationPublic | null,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/google/integrations/me");
  }
}

// PATCH /api/google/integrations/me
// Atualiza configuracao (folder, keywords, mime_types). Nao toca tokens.
export async function PATCH(req: NextRequest) {
  try {
    const { profile } = await requireAuth();
    if (!canRecordCalls(profile.role)) {
      return forbidden("Apenas closers podem editar");
    }

    const body = await req.json();
    const parsed = googleDriveConfigSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("google_drive_integrations")
      .select("id, status")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!existing) {
      return notFound("Conecte o Google Drive primeiro");
    }

    const update = {
      folder_id: parsed.data.folder_id,
      folder_name: parsed.data.folder_name ?? null,
      file_keywords: parsed.data.file_keywords,
      ...(parsed.data.file_mime_types
        ? { file_mime_types: parsed.data.file_mime_types }
        : {}),
    };

    const { error } = await admin
      .from("google_drive_integrations")
      .update(update)
      .eq("id", existing.id);
    if (error) {
      throw new Error(`update integration: ${error.message}`);
    }

    await logEvent({
      entityType: "google_drive_integration",
      entityId: profile.id,
      eventType: "google_drive_config_updated",
      userId: profile.id,
      after: update,
    });

    return ok({ updated: true });
  } catch (err) {
    return handleApiError(err, "PATCH /api/google/integrations/me");
  }
}
