import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppEnv } from "@/lib/whatsapp/env";
import { verifyWebhookSecret } from "@/lib/whatsapp/webhook-verify";
import { webhookEventSchema } from "@/lib/schemas/chat";
import {
  handleConnected,
  handleDisconnected,
  handleMessageReceived,
} from "@/lib/whatsapp/webhook-handlers";

// Webhook do NextTrack.
// Autenticação: ?secret=<NEXTAPPS_WEBHOOK_SECRET> na Callback URL.
// 200 em erros internos pra evitar retry-storm; só 401 em assinatura inválida.
export async function POST(req: NextRequest) {
  let env;
  try {
    env = getWhatsAppEnv();
  } catch (err) {
    console.error("[wa/webhook] env inválido", err);
    return new NextResponse("env error", { status: 500 });
  }

  const provided = req.nextUrl.searchParams.get("secret");
  if (!verifyWebhookSecret(provided, env.NEXTAPPS_WEBHOOK_SECRET)) {
    return new NextResponse("invalid secret", { status: 401 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = await req.json();
  } catch (err) {
    console.error("[wa/webhook] body JSON inválido", err);
    return NextResponse.json({ ok: true, ignored: "invalid_json" });
  }

  const parsed = webhookEventSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.warn(
      "[wa/webhook] payload inválido (ignorado)",
      parsed.error.flatten()
    );
    return NextResponse.json({ ok: true, ignored: "invalid_payload" });
  }

  const event = parsed.data;
  const admin = createAdminClient();

  try {
    if (event.event === "message_received") {
      await handleMessageReceived(admin, event);
    } else if (event.event === "connected") {
      await handleConnected(admin, event);
    } else if (event.event === "disconnected") {
      await handleDisconnected(admin, event);
    }
  } catch (err) {
    console.error("[wa/webhook] handler erro", err);
  }

  return NextResponse.json({ ok: true });
}
