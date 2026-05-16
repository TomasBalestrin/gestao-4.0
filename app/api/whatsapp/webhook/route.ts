import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppEnv } from "@/lib/whatsapp/env";
import { webhookEventSchema } from "@/lib/schemas/chat";
import {
  handleConnected,
  handleDisconnected,
  handleMessageReceived,
} from "@/lib/whatsapp/webhook-handlers";

// NextApps/NextTrack manda nomes de evento sem padrão único entre provedores
// (snake_case, camelCase, *Callback). Normalizamos para os 3 literals do schema.
const EVENT_ALIASES: Record<string, "message_received" | "connected" | "disconnected"> = {
  message_received: "message_received",
  messagereceived: "message_received",
  receivedcallback: "message_received",
  messages_upsert: "message_received",
  "messages.upsert": "message_received",
  onmessagereceived: "message_received",
  connected: "connected",
  connectedcallback: "connected",
  onconnect: "connected",
  disconnected: "disconnected",
  disconnectedcallback: "disconnected",
  ondisconnect: "disconnected",
};

function normalizeEvent(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const eventField = obj.event ?? obj.type ?? obj.eventType;
  if (typeof eventField !== "string") return raw;
  const key = eventField.toLowerCase().replace(/[_\-\s]/g, "");
  const canon = EVENT_ALIASES[key];
  if (!canon) return raw;
  return { ...obj, event: canon };
}

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

  const rawEventName =
    parsedJson && typeof parsedJson === "object"
      ? ((parsedJson as Record<string, unknown>).event ??
          (parsedJson as Record<string, unknown>).type ??
          (parsedJson as Record<string, unknown>).eventType)
      : undefined;
  console.log(
    `[wa/webhook] evento recebido: ${typeof rawEventName === "string" ? rawEventName : "<sem campo event>"}`
  );

  const normalized = normalizeEvent(parsedJson);
  const parsed = webhookEventSchema.safeParse(normalized);
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
