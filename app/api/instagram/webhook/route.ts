import { NextRequest, NextResponse } from "next/server";

import { getInstagramEnv } from "@/lib/instagram/env";
import {
  processWebhookEvent,
  webhookEventSchema,
} from "@/lib/instagram/webhook-handlers";

// Validacao do webhook (Meta envia GET com hub.* na configuracao inicial).
// https://developers.facebook.com/docs/instagram-messaging/webhooks/
export async function GET(req: NextRequest) {
  const env = getInstagramEnv();
  if (!env) {
    return NextResponse.json(
      { error: "Instagram nao configurado", code: "NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "verify_token invalido" }, { status: 403 });
}

// Recebe eventos. Meta espera 200 rapido; processamento e best-effort.
export async function POST(req: NextRequest) {
  const env = getInstagramEnv();
  if (!env) {
    return NextResponse.json(
      { error: "Instagram nao configurado", code: "NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  // TODO: validar assinatura X-Hub-Signature-256 com META_APP_SECRET pra
  // garantir que o evento veio do Meta. Por ora confia no path obscuro
  // + verify_token.

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "json invalido" }, { status: 400 });
  }

  const parsed = webhookEventSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[ig/webhook] payload invalido", parsed.error);
    return NextResponse.json({ ok: true });
  }

  try {
    await processWebhookEvent(parsed.data);
  } catch (err) {
    console.error("[ig/webhook] processamento falhou", err);
  }
  return NextResponse.json({ ok: true });
}
