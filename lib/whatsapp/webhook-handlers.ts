import type { createAdminClient } from "@/lib/supabase/admin";
import type {
  ConnectionUpdateEvent,
  MessagesUpdateEvent,
  MessagesUpsertEvent,
} from "@/lib/schemas/chat";
import type { ChatContentType, Json } from "@/lib/database.types";

import { jidToPhone } from "./phone";
import { createInboundLeadAndCard } from "./lead-resolver";
import { downloadMedia } from "./nextapi-client";
import { uploadChatMedia } from "./media-storage";
import { getWhatsAppEnv } from "./env";
import { logEvent } from "@/lib/audit/logger";
import { sendInAppNotification } from "@/lib/automation/notifications";

type AdminClient = ReturnType<typeof createAdminClient>;

function previewFromText(text: string | null | undefined, max = 80): string {
  if (!text) return "";
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > max ? single.slice(0, max - 1) + "…" : single;
}

export async function handleConnectionUpdate(
  admin: AdminClient,
  ev: ConnectionUpdateEvent
): Promise<void> {
  const { data: instance } = await admin
    .from("wa_instances")
    .select("id, user_id, status")
    .eq("nextapi_instance_id", ev.instanceId)
    .maybeSingle();

  if (!instance) {
    console.warn(
      `[wa/webhook] connection.update sem instância: ${ev.instanceId}`
    );
    return;
  }

  const now = new Date().toISOString();
  if (ev.status === "open") {
    await admin
      .from("wa_instances")
      .update({
        status: "connected",
        phone_number: ev.phoneNumber ?? null,
        last_connected_at: now,
        last_qr_code: null,
      })
      .eq("id", instance.id);
    await logEvent({
      entityType: "wa_instance",
      entityId: instance.id,
      eventType: "wa_instance_connected",
      userId: instance.user_id,
      after: { phone_number: ev.phoneNumber ?? null },
    });
  } else if (ev.status === "close") {
    await admin
      .from("wa_instances")
      .update({ status: "disconnected", last_disconnected_at: now })
      .eq("id", instance.id);
    await logEvent({
      entityType: "wa_instance",
      entityId: instance.id,
      eventType: "wa_instance_disconnected",
      userId: instance.user_id,
    });
  } else if (ev.status === "qr") {
    await admin
      .from("wa_instances")
      .update({
        status: "qr_pending",
        last_qr_code: ev.qrCode ?? null,
        last_qr_at: now,
      })
      .eq("id", instance.id);
  }
}

function contentTypeFromEvent(type: MessagesUpsertEvent["type"]): ChatContentType {
  switch (type) {
    case "text":
    case "image":
    case "audio":
    case "video":
    case "document":
    case "sticker":
    case "location":
      return type;
    default:
      return "unsupported";
  }
}

export async function handleMessagesUpsert(
  admin: AdminClient,
  ev: MessagesUpsertEvent
): Promise<void> {
  if (ev.isGroup) return;

  // 1. Resolver instância.
  const { data: instance } = await admin
    .from("wa_instances")
    .select("id, user_id")
    .eq("nextapi_instance_id", ev.instanceId)
    .maybeSingle();
  if (!instance) {
    console.warn(`[wa/webhook] messages.upsert sem instância: ${ev.instanceId}`);
    return;
  }

  // 2. Determinar remote (contraparte) — sempre o JID do contato, não nosso.
  const remoteJid = ev.fromMe ? ev.to ?? ev.from : ev.from;
  const phone = jidToPhone(remoteJid);
  if (!phone) {
    console.warn(`[wa/webhook] JID inválido: ${remoteJid}`);
    return;
  }

  // 3. Get-or-create thread (UNIQUE lead_id+wa_instance_id, mas indexamos por remote_jid+instance).
  let { data: thread } = await admin
    .from("chat_threads")
    .select("id, lead_id")
    .eq("wa_instance_id", instance.id)
    .eq("remote_jid", remoteJid)
    .maybeSingle();

  let threadId: string;
  let leadId: string;
  let funilId: string | null = null;
  let cardId: string | null = null;

  if (thread) {
    threadId = thread.id;
    leadId = thread.lead_id;
  } else {
    const created = await createInboundLeadAndCard(admin, {
      phone,
      pushName: ev.pushName ?? null,
      instanceUserId: instance.user_id,
    });
    if (!created) {
      console.warn(
        "[wa/webhook] dropando mensagem: inbound_default_funil_id não configurado"
      );
      return;
    }
    leadId = created.leadId;
    cardId = created.cardId;
    funilId = created.funilId;

    const { data: newThread, error: threadErr } = await admin
      .from("chat_threads")
      .insert({
        lead_id: leadId,
        wa_instance_id: instance.id,
        remote_jid: remoteJid,
      })
      .select("id")
      .single();
    if (threadErr || !newThread) {
      console.error("[wa/webhook] falha criando thread", threadErr);
      return;
    }
    threadId = newThread.id;
  }

  // 4. Lidar com mídia se existir.
  let mediaPath: string | null = null;
  let mediaMime: string | null = ev.mimeType ?? null;
  let mediaSize: number | null = ev.size ?? null;
  let contentType = contentTypeFromEvent(ev.type);

  if (ev.mediaUrl && contentType !== "text" && contentType !== "location") {
    const env = getWhatsAppEnv();
    try {
      const dl = await downloadMedia(ev.mediaUrl);
      if (dl.size > env.NEXTAPI_MEDIA_MAX_BYTES) {
        console.warn(
          `[wa/webhook] mídia excede limite (${dl.size} bytes) — content_type=unsupported`
        );
        contentType = "unsupported";
      } else {
        mediaPath = await uploadChatMedia({
          admin,
          waInstanceId: instance.id,
          messageId: ev.messageId,
          bytes: dl.bytes,
          mimeType: ev.mimeType ?? dl.contentType,
        });
        mediaMime = ev.mimeType ?? dl.contentType;
        mediaSize = dl.size;
      }
    } catch (err) {
      console.error("[wa/webhook] falha ao baixar mídia", err);
      contentType = "unsupported";
    }
  }

  // 5. INSERT mensagem (idempotente via UNIQUE nextapi_message_id).
  const text = ev.text ?? ev.caption ?? null;
  const direction = ev.fromMe ? "outbound" : "inbound";

  const { data: inserted, error: insertErr } = await admin
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      nextapi_message_id: ev.messageId,
      direction,
      from_me: ev.fromMe,
      content_type: contentType,
      text,
      media_path: mediaPath,
      media_mime_type: mediaMime,
      media_size_bytes: mediaSize,
      metadata: (ev.metadata ?? null) as Json | null,
      wa_timestamp: new Date(ev.timestamp * 1000).toISOString(),
    })
    .select("id")
    .maybeSingle();

  // Conflict (idempotência) → not an error, sai sem update extra.
  if (insertErr) {
    if (insertErr.code === "23505") return;
    console.error("[wa/webhook] falha INSERT chat_messages", insertErr);
    return;
  }
  if (!inserted) return;

  // 6. Atualizar thread (preview + counter).
  const preview =
    contentType === "text"
      ? previewFromText(text)
      : `[${contentType}]${text ? " " + previewFromText(text) : ""}`;

  const threadPatch: {
    last_message_at: string;
    last_message_preview: string;
    unread_count?: number;
  } = {
    last_message_at: new Date(ev.timestamp * 1000).toISOString(),
    last_message_preview: preview,
  };

  if (direction === "inbound") {
    const { data: cur } = await admin
      .from("chat_threads")
      .select("unread_count")
      .eq("id", threadId)
      .single();
    threadPatch.unread_count = (cur?.unread_count ?? 0) + 1;
  }

  await admin.from("chat_threads").update(threadPatch).eq("id", threadId);

  // 7. Notificação in-app (só inbound, só pro dono da instância).
  if (direction === "inbound") {
    // Precisamos do funil_id pra montar o link — se não temos do create, busca via card.
    let linkFunilId = funilId;
    let linkCardId = cardId;
    if (!linkFunilId || !linkCardId) {
      const { data: card } = await admin
        .from("cards")
        .select("id, funil_id")
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      linkFunilId = card?.funil_id ?? null;
      linkCardId = card?.id ?? null;
    }

    const link = linkFunilId
      ? `/crm/${linkFunilId}?lead=${leadId}`
      : `/perfil`;

    try {
      await sendInAppNotification(admin, {
        userIds: [instance.user_id],
        tipo: "chat_message_received",
        titulo: (ev.pushName ?? phone).trim() || phone,
        descricao: preview || "Nova mensagem",
        link,
        metadata: { lead_id: leadId, thread_id: threadId, card_id: linkCardId } as Json,
      });
    } catch (err) {
      console.error("[wa/webhook] notificação falhou", err);
    }
  }
}

export async function handleMessagesUpdate(
  admin: AdminClient,
  ev: MessagesUpdateEvent
): Promise<void> {
  const now = new Date().toISOString();
  const patch: {
    delivered_at?: string;
    read_at?: string;
    failed_reason?: string;
  } = {};
  if (ev.status === "delivered") patch.delivered_at = now;
  else if (ev.status === "read") patch.read_at = now;
  else if (ev.status === "failed") patch.failed_reason = ev.failedReason ?? "failed";
  else if (ev.status === "sent") patch.delivered_at = patch.delivered_at ?? now;

  if (Object.keys(patch).length === 0) return;
  await admin
    .from("chat_messages")
    .update(patch)
    .eq("nextapi_message_id", ev.messageId);
}
