import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleEnv } from "@/lib/google/env";
import { refreshAccessToken } from "@/lib/google/oauth";
import { listFolders } from "@/lib/google/drive-client";
import { canRecordCalls } from "@/lib/utils/permissions";
import {
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

import type { GoogleDriveFolderOption } from "@/types/domain";

// GET /api/google/folders
// Lista pastas do Drive do closer logado. Faz refresh on-the-fly se token
// expirado.
export async function GET(_req: NextRequest) {
  try {
    const env = getGoogleEnv();
    if (!env) {
      return NextResponse.json(
        { error: "Google Drive nao configurado", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    const { profile } = await requireAuth();
    if (!canRecordCalls(profile.role)) {
      return forbidden("Apenas closers");
    }

    const admin = createAdminClient();
    const { data: integration } = await admin
      .from("google_drive_integrations")
      .select("id, access_token, refresh_token, token_expires_at, status")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!integration || integration.status !== "connected") {
      return notFound("Conecte o Google Drive primeiro");
    }
    if (!integration.access_token || !integration.refresh_token) {
      return notFound("Tokens ausentes, reconecte o Drive");
    }

    let accessToken = integration.access_token;
    const expiresAt = integration.token_expires_at
      ? new Date(integration.token_expires_at).getTime()
      : 0;
    // Refresh proativo se expira em menos de 5 min.
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
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
          })
          .eq("id", integration.id);
      } catch (err) {
        console.error("[google/folders] refresh falhou", err);
        await admin
          .from("google_drive_integrations")
          .update({
            status: "expired_token",
            last_error:
              err instanceof Error ? err.message : "refresh falhou",
          })
          .eq("id", integration.id);
        return NextResponse.json(
          { error: "Token expirado, reconecte o Drive", code: "EXPIRED_TOKEN" },
          { status: 401 }
        );
      }
    }

    const folders = await listFolders(accessToken);
    return ok<{ folders: GoogleDriveFolderOption[] }>({ folders });
  } catch (err) {
    return handleApiError(err, "GET /api/google/folders");
  }
}
