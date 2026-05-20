import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleEnv } from "@/lib/google/env";
import { syncCloserCalls } from "@/lib/google/sync-engine";

// GET /api/cron/google-drive-sync
// Protegido por Authorization: Bearer ${CRON_SECRET}.
// Sync de todos closers com integration connected.
// Vercel Cron: schedule "0 9,14,19 * * *".
//
// IMPORTANTE: serverless do Vercel tem timeout (10s no plano hobby, 60s no
// pro). Pra muitos closers, considerar splitting por closer (queue + worker).
export const maxDuration = 60;

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
  const { data: integrations } = await admin
    .from("google_drive_integrations")
    .select("user_id")
    .eq("status", "connected");

  const summaries: Awaited<ReturnType<typeof syncCloserCalls>>[] = [];

  for (const integ of integrations ?? []) {
    try {
      const result = await syncCloserCalls(integ.user_id);
      summaries.push(result);
    } catch (err) {
      console.error(
        "[cron/google-drive-sync] erro inesperado",
        integ.user_id,
        err
      );
      summaries.push({
        closer_id: integ.user_id,
        processed: 0,
        matched: 0,
        unmatched: 0,
        failed: 1,
        skipped: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      processed: acc.processed + s.processed,
      matched: acc.matched + s.matched,
      unmatched: acc.unmatched + s.unmatched,
      failed: acc.failed + s.failed,
      skipped: acc.skipped + s.skipped,
    }),
    { processed: 0, matched: 0, unmatched: 0, failed: 0, skipped: 0 }
  );

  return NextResponse.json({
    closers_synced: summaries.length,
    totals,
    summaries,
  });
}
