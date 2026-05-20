import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleEnv } from "@/lib/google/env";
import { refreshAccessToken } from "@/lib/google/oauth";
import { logEvent } from "@/lib/audit/logger";

// GET /api/cron/google-drive-refresh-tokens
// Protegido por Authorization: Bearer ${CRON_SECRET}.
// Renova access_token de integrations connected que expiram em <= 1h.
// Vercel Cron: schedule "0 4 * * *".
export async function GET(req: NextRequest) {
  const env = getGoogleEnv();
  if (!env) {
    return NextResponse.json(
      { error: "Google Drive nao configurado" },
      { status: 503 }
    );
  }
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET nao configurado" },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  // Refresh proativo: tokens que expiram nas proximas 24h.
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: integrations } = await admin
    .from("google_drive_integrations")
    .select("id, user_id, refresh_token, token_expires_at")
    .eq("status", "connected")
    .or(`token_expires_at.is.null,token_expires_at.lte.${cutoff}`);

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const integ of integrations ?? []) {
    if (!integ.refresh_token) {
      results.push({
        id: integ.id,
        ok: false,
        error: "refresh_token ausente",
      });
      await admin
        .from("google_drive_integrations")
        .update({
          status: "expired_token",
          last_error: "refresh_token ausente",
        })
        .eq("id", integ.id);
      continue;
    }
    try {
      const refreshed = await refreshAccessToken(integ.refresh_token);
      const newExpiresAt = new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString();
      await admin
        .from("google_drive_integrations")
        .update({
          access_token: refreshed.access_token,
          token_expires_at: newExpiresAt,
          last_refreshed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", integ.id);
      await logEvent({
        entityType: "google_drive_integration",
        entityId: integ.user_id,
        eventType: "google_drive_token_refreshed",
        userId: null,
      });
      results.push({ id: integ.id, ok: true });
    } catch (err) {
      await admin
        .from("google_drive_integrations")
        .update({
          status: "expired_token",
          last_error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", integ.id);
      results.push({
        id: integ.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    refreshed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
