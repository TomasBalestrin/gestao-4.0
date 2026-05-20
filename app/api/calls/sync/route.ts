import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { getGoogleEnv } from "@/lib/google/env";
import { syncCloserCalls } from "@/lib/google/sync-engine";
import { canRecordCalls } from "@/lib/utils/permissions";
import {
  forbidden,
  handleApiError,
  ok,
} from "@/server/api-helpers";

// POST /api/calls/sync
// Dispara sync manual pro closer logado. Mesma logica do cron mas por user.
export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  try {
    const env = getGoogleEnv();
    if (!env) {
      return forbidden("Google Drive nao configurado");
    }
    const { profile } = await requireAuth();
    if (!canRecordCalls(profile.role)) {
      return forbidden("Apenas closers podem sincronizar");
    }

    const summary = await syncCloserCalls(profile.id);
    return ok({ summary });
  } catch (err) {
    return handleApiError(err, "POST /api/calls/sync");
  }
}
