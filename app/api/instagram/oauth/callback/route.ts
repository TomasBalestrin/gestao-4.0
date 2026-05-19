import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInstagramEnv } from "@/lib/instagram/env";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
} from "@/lib/instagram/oauth";
import {
  getInstagramAccountDetails,
  listUserPages,
  subscribePageToApp,
} from "@/lib/instagram/graph-client";
import { logEvent } from "@/lib/audit/logger";
import { handleApiError } from "@/server/api-helpers";

// GET /api/instagram/oauth/callback?code=&state=
// Recebe o redirect do Facebook depois do consent. Valida state CSRF,
// troca code por long-lived token, descobre a conta IG ligada a alguma
// page autorizada e salva/atualiza ig_instances.
export async function GET(req: NextRequest) {
  try {
    const env = getInstagramEnv();
    if (!env) {
      return NextResponse.json(
        { error: "Instagram nao configurado", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    const { user } = await requireAdmin();

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/admin/funis?ig_error=missing_code`
      );
    }

    const cookieStore = cookies();
    const stored = cookieStore.get("ig_oauth_state")?.value;
    cookieStore.delete("ig_oauth_state");
    if (!stored) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/admin/funis?ig_error=state_expired`
      );
    }
    const [storedState, funilId] = stored.split("|");
    if (storedState !== state || !funilId) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/admin/funis?ig_error=state_mismatch`
      );
    }

    // Troca code -> short -> long-lived.
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.access_token);

    // Descobre Pages e a primeira com Instagram Business Account.
    const pages = await listUserPages(long.access_token);
    const pageWithIg = pages.find((p) => p.instagram_business_account?.id);
    if (!pageWithIg || !pageWithIg.instagram_business_account) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/admin/funis/${funilId}?ig_error=no_ig_account`
      );
    }
    const igUserId = pageWithIg.instagram_business_account.id;
    const pageAccessToken = pageWithIg.access_token;

    // Subscribe webhook da page no nosso app.
    try {
      await subscribePageToApp({
        pageId: pageWithIg.id,
        pageAccessToken,
      });
    } catch (err) {
      console.error("[ig/oauth/callback] subscribe falhou", err);
      // Continua mesmo assim; admin pode resubscribe manual.
    }

    // Detalhes da conta IG (username).
    let igUsername: string | null = null;
    try {
      const details = await getInstagramAccountDetails({
        igUserId,
        accessToken: pageAccessToken,
      });
      igUsername = details.username ?? null;
    } catch (err) {
      console.warn("[ig/oauth/callback] getInstagramAccountDetails falhou", err);
    }

    const tokenExpiresAt = new Date(
      Date.now() + long.expires_in * 1000
    ).toISOString();

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("ig_instances")
      .select("id")
      .eq("funil_id", funilId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("ig_instances")
        .update({
          ig_user_id: igUserId,
          ig_username: igUsername,
          page_id: pageWithIg.id,
          access_token: pageAccessToken,
          token_expires_at: tokenExpiresAt,
          status: "connected",
          connected_by_user_id: user.id,
          last_connected_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await admin.from("ig_instances").insert({
        funil_id: funilId,
        ig_user_id: igUserId,
        ig_username: igUsername,
        page_id: pageWithIg.id,
        access_token: pageAccessToken,
        token_expires_at: tokenExpiresAt,
        status: "connected",
        connected_by_user_id: user.id,
        last_connected_at: new Date().toISOString(),
      });
    }

    await logEvent({
      entityType: "funil",
      entityId: funilId,
      eventType: "ig_instance_connected",
      userId: user.id,
      metadata: { ig_user_id: igUserId, page_id: pageWithIg.id },
    });

    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/admin/funis/${funilId}?ig_connected=1`
    );
  } catch (err) {
    return handleApiError(err, "GET /api/instagram/oauth/callback");
  }
}
