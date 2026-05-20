import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireAuth } from "@/server/auth";
import { getGoogleEnv } from "@/lib/google/env";
import { buildAuthUrl, generateState } from "@/lib/google/oauth";
import { canRecordCalls } from "@/lib/utils/permissions";
import { forbidden, handleApiError } from "@/server/api-helpers";

// GET /api/google/oauth/start
// Closer-only. Gera state CSRF, salva em cookie e redireciona pro Google
// Consent. Apos autorizar, Google redireciona pra /api/google/oauth/callback.
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
      return forbidden("Apenas closers podem conectar Google Drive");
    }

    const state = generateState();
    const cookieStore = cookies();
    cookieStore.set("g_oauth_state", `${state}|${profile.id}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });

    return NextResponse.redirect(buildAuthUrl({ state }));
  } catch (err) {
    return handleApiError(err, "GET /api/google/oauth/start");
  }
}
