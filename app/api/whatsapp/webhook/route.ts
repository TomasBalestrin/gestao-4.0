import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppEnv } from "@/lib/whatsapp/env";
import { webhookEventSchema } from "@/lib/schemas/chat";
import {
  handleConnected,
  handleDisconnected,
  handleMessageReceived,
} from "@/lib/whatsapp/webhook-handlers";

// Webhook do NextTrack/NextApps.
// Sem secret: confiamos no filtro por instance_id (eventos com instanceId
// desconhecido são dropados). 200 em erros internos pra evitar retry-storm.
export async function POST(req: NextRequest) {
  try {
    getWhatsAppEnv();
  } catch (err) {
    console.error("[wa/webhook] env inválido", err);
    return new NextResponse("env error", { status: 500 });
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
      JSON.stringify(parsed.error.flatten()),
      "body:",
      JSON.stringify(parsedJson)
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
