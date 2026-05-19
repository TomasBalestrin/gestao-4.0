import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getInstagramEnv } from "@/lib/instagram/env";
import { refreshLongLivedToken } from "@/lib/instagram/oauth";
import { logEvent } from "@/lib/audit/logger";

// GET /api/cron/instagram-refresh-tokens
// Protegido por Authorization: Bearer ${CRON_SECRET}.
// Renova tokens long-lived que expiram em <= 7 dias.
// Pra agendar: Vercel Cron (vercel.json) com schedule "0 3 * * *".
export async function GET(req: NextRequest) {
  const env = getInstagramEnv();
  if (!env) {
    return NextResponse.json(
      { error: "Instagram nao configurado" },
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
  const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: instances } = await admin
    .from("ig_instances")
    .select("id, funil_id, access_token, token_expires_at")
    .eq("status", "connected")
    .or(`token_expires_at.is.null,token_expires_at.lte.${cutoff}`);

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const inst of instances ?? []) {
    try {
      const refreshed = await refreshLongLivedToken(inst.access_token);
      const newExpiresAt = new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString();
      await admin
        .from("ig_instances")
        .update({
          access_token: refreshed.access_token,
          token_expires_at: newExpiresAt,
          last_refreshed_at: new Date().toISOString(),
        })
        .eq("id", inst.id);
      await logEvent({
        entityType: "funil",
        entityId: inst.funil_id,
        eventType: "ig_token_refreshed",
        userId: null,
        metadata: { ig_instance_id: inst.id },
      });
      results.push({ id: inst.id, ok: true });
    } catch (err) {
      await admin
        .from("ig_instances")
        .update({ status: "expired_token" })
        .eq("id", inst.id);
      results.push({ id: inst.id, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({
    refreshed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
