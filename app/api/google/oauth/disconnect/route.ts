import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleEnv } from "@/lib/google/env";
import { revokeToken } from "@/lib/google/oauth";
import { logEvent } from "@/lib/audit/logger";
import { canRecordCalls } from "@/lib/utils/permissions";
import {
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

// POST /api/google/oauth/disconnect
// Revoga token no Google, marca integration como disconnected.
// Mantem o registro pra historico; nao deleta call_analyses ja processadas.
export async function POST(_req: NextRequest) {
  try {
    const env = getGoogleEnv();
    if (!env) {
      return forbidden("Google Drive nao configurado");
    }
    const { profile } = await requireAuth();
    if (!canRecordCalls(profile.role)) {
      return forbidden("Apenas closers podem desconectar");
    }

    const admin = createAdminClient();
    const { data: integration } = await admin
      .from("google_drive_integrations")
      .select("id, access_token, refresh_token")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!integration) {
      return notFound("Integration nao encontrada");
    }

    // Revoga no Google (best-effort).
    if (integration.refresh_token) {
      await revokeToken(integration.refresh_token);
    } else if (integration.access_token) {
      await revokeToken(integration.access_token);
    }

    await admin
      .from("google_drive_integrations")
      .update({
        status: "disconnected",
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
      })
      .eq("id", integration.id);

    await logEvent({
      entityType: "google_drive_integration",
      entityId: profile.id,
      eventType: "google_drive_disconnected",
      userId: profile.id,
    });

    return ok({ disconnected: true });
  } catch (err) {
    return handleApiError(err, "POST /api/google/oauth/disconnect");
  }
}
