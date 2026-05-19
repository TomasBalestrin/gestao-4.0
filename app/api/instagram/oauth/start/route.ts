import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireAdmin } from "@/server/auth";
import { getInstagramEnv } from "@/lib/instagram/env";
import { buildAuthUrl, generateState } from "@/lib/instagram/oauth";
import { handleApiError } from "@/server/api-helpers";

// GET /api/instagram/oauth/start?funilId=...
// Admin only. Gera state CSRF, salva em cookie e redireciona pro Facebook
// Login. Apos autorizar, Meta redireciona pra /api/instagram/oauth/callback.
export async function GET(req: NextRequest) {
  try {
    const env = getInstagramEnv();
    if (!env) {
      return NextResponse.json(
        { error: "Instagram nao configurado", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    await requireAdmin();

    const funilId = new URL(req.url).searchParams.get("funilId");
    if (!funilId) {
      return NextResponse.json({ error: "funilId obrigatorio" }, { status: 400 });
    }

    const state = generateState();
    const cookieStore = cookies();
    cookieStore.set("ig_oauth_state", `${state}|${funilId}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });

    return NextResponse.redirect(buildAuthUrl({ state, funilId }));
  } catch (err) {
    return handleApiError(err, "GET /api/instagram/oauth/start");
  }
}
