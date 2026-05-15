import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppEnv } from "@/lib/whatsapp/env";
import { verifyWebhookSignature } from "@/lib/whatsapp/webhook-verify";
import { webhookEventSchema } from "@/lib/schemas/chat";
import {
  handleConnectionUpdate,
  handleMessagesUpdate,
  handleMessagesUpsert,
} from "@/lib/whatsapp/webhook-handlers";

// Webhook do provider NextAPI.
// IMPORTANTE: retornamos 200 em erros internos para evitar retry-storm.
// Apenas erros de assinatura retornam 401.
export async function POST(req: NextRequest) {
  let env;
  try {
    env = getWhatsAppEnv();
  } catch (err) {
    console.error("[wa/webhook] env inválido", err);
    return new NextResponse("env error", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-nextapi-signature");
  if (!verifyWebhookSignature(rawBody, signature, env.NEXTAPI_WEBHOOK_SECRET)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
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
    if (event.event === "connection.update") {
      await handleConnectionUpdate(admin, event);
    } else if (event.event === "messages.upsert") {
      await handleMessagesUpsert(admin, event);
    } else if (event.event === "messages.update") {
      await handleMessagesUpdate(admin, event);
    }
  } catch (err) {
    console.error("[wa/webhook] handler erro", err);
    // 200 mesmo em erro pra evitar retry-storm. Erros já logados.
  }

  return NextResponse.json({ ok: true });
}
