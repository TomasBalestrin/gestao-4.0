import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleEnv } from "@/lib/google/env";
import {
  exchangeCodeForToken,
  getUserEmail,
} from "@/lib/google/oauth";
import { logEvent } from "@/lib/audit/logger";
import { canRecordCalls } from "@/lib/utils/permissions";
import { handleApiError } from "@/server/api-helpers";

// GET /api/google/oauth/callback?code=&state=
// Recebe o redirect do Google depois do consent. Valida state CSRF,
// troca code por access_token+refresh_token e upsert na google_drive_integrations.
export async function GET(req: NextRequest) {
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
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/closer?g_error=forbidden`
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/closer/google-drive?g_error=missing_code`
      );
    }

    const cookieStore = cookies();
    const stored = cookieStore.get("g_oauth_state")?.value;
    cookieStore.delete("g_oauth_state");
    if (!stored) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/closer/google-drive?g_error=state_expired`
      );
    }
    const [storedState, storedUserId] = stored.split("|");
    if (storedState !== state || storedUserId !== profile.id) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/closer/google-drive?g_error=state_mismatch`
      );
    }

    // Troca code por tokens.
    const tokens = await exchangeCodeForToken(code);
    if (!tokens.refresh_token) {
      // Sem refresh_token, nao da pra renovar depois. Forca prompt=consent
      // resolvido no buildAuthUrl, mas o usuario pode ter consentido antes
      // sem o app pedir offline access. Pedir desconectar manualmente em
      // myaccount.google.com e reconectar.
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/closer/google-drive?g_error=no_refresh_token`
      );
    }

    const email = await getUserEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("google_drive_integrations")
      .select("id")
      .eq("user_id", profile.id)
      .maybeSingle();

    const payload = {
      google_email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      status: "connected" as const,
      last_refreshed_at: new Date().toISOString(),
      last_error: null,
    };

    if (existing) {
      await admin
        .from("google_drive_integrations")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await admin
        .from("google_drive_integrations")
        .insert({ user_id: profile.id, ...payload });
    }

    await logEvent({
      entityType: "google_drive_integration",
      entityId: profile.id,
      eventType: "google_drive_connected",
      userId: profile.id,
      metadata: { google_email: email },
    });

    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/closer/google-drive?g_connected=1`
    );
  } catch (err) {
    return handleApiError(err, "GET /api/google/oauth/callback");
  }
}
