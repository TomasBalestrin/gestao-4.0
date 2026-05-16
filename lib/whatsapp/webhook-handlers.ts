import type { createAdminClient } from "@/lib/supabase/admin";
import type {
  ConnectedEvent,
  DisconnectedEvent,
  MessageReceivedEvent,
} from "@/lib/schemas/chat";
import type { ChatContentType, Json } from "@/lib/database.types";

import { digitsOnly, phoneToJid } from "./phone";
import { createInboundLeadAndCard } from "./lead-resolver";
import { downloadInboundMedia } from "./nextapi-client";
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

function timestampFromMoment(m: string | number | null | undefined): Date {
  if (m == null || m === "") return new Date();
  const d = typeof m === "number" ? new Date(m) : new Date(m);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

// A NextTrack envia dois identificadores: `ev.instanceId` (UUID interno do
// banco deles) e `ev.data.instanceId` (slug visível no painel — esse é o
// valor que o usuário cola no Gestão 4.0). Preferimos o slug; se ausente,
// caímos no UUID raiz como fallback.
function resolveInstanceKey(
  ev: ConnectedEvent | DisconnectedEvent | MessageReceivedEvent
): string {
  const dataId = (ev.data as { instanceId?: string | null }).instanceId;
  return dataId && dataId.trim() !== "" ? dataId : ev.instanceId;
}

export async function handleConnected(
  admin: AdminClient,
  ev: ConnectedEvent
): Promise<void> {
  const key = resolveInstanceKey(ev);
  const { data: instance, error: fetchErr } = await admin
    .from("wa_instances")
    .select("id, user_id, nextapi_instance_id")
    .eq("nextapi_instance_id", key)
    .maybeSingle();
  if (fetchErr) {
    console.error("[wa/webhook] connected fetch erro", fetchErr);
    return;
  }
  if (!instance) {
    console.warn(
      `[wa/webhook] connected sem instância: chave='${key}' (root='${ev.instanceId}', data='${ev.data.instanceId ?? ""}')`
    );
    return;
  }
  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("wa_instances")
    .update({
      status: "connected",
      phone_number: ev.data.phone ?? null,
      last_connected_at: now,
      last_qr_code: null,
    })
    .eq("id", instance.id);
  if (updErr) {
    console.error("[wa/webhook] connected update erro", updErr);
    return;
  }
  await logEvent({
    entityType: "wa_instance",
    entityId: instance.id,
    eventType: "wa_instance_connected",
    userId: instance.user_id,
    after: { phone_number: ev.data.phone ?? null },
  });
}

export async function handleDisconnected(
  admin: AdminClient,
  ev: DisconnectedEvent
): Promise<void> {
  const key = resolveInstanceKey(ev);
  const { data: instance } = await admin
    .from("wa_instances")
    .select("id, user_id")
    .eq("nextapi_instance_id", key)
    .maybeSingle();
  if (!instance) {
    console.warn(`[wa/webhook] disconnected sem instância: chave='${key}'`);
    return;
  }
  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("wa_instances")
    .update({ status: "disconnected", last_disconnected_at: now })
    .eq("id", instance.id);
  if (updErr) {
    console.error("[wa/webhook] disconnected update erro", updErr);
    return;
  }
  await logEvent({
    entityType: "wa_instance",
    entityId: instance.id,
    eventType: "wa_instance_disconnected",
    userId: instance.user_id,
  });
}

interface ExtractedMessage {
  contentType: ChatContentType;
  text: string | null;
  mediaUrl: string | null;
  mimeType: string | null;
  filename: string | null;
}

function extractMessage(ev: MessageReceivedEvent): ExtractedMessage {
  const d = ev.data;
  switch (d.messageType) {
    case "text":
      return {
        contentType: "text",
        text: d.text?.message ?? null,
        mediaUrl: null,
        mimeType: null,
        filename: null,
      };
    case "image":
      return {
        contentType: "image",
        text: d.media?.caption ?? null,
        mediaUrl: d.media?.url ?? null,
        mimeType: d.media?.mimeType ?? null,
        filename: null,
      };
    case "audio":
      return {
        contentType: "audio",
        text: null,
        mediaUrl: d.audio?.audioUrl ?? null,
        mimeType: d.audio?.mimeType ?? null,
        filename: null,
      };
    case "video":
      return {
        contentType: "video",
        text: d.video?.caption ?? null,
        mediaUrl: d.video?.videoUrl ?? null,
        mimeType: d.video?.mimeType ?? null,
        filename: null,
      };
    case "document":
      return {
        contentType: "document",
        text: null,
        mediaUrl: d.document?.url ?? null,
        mimeType: d.document?.mimeType ?? null,
        filename: d.document?.filename ?? null,
      };
    case "location":
      return {
        contentType: "location",
        text:
          d.location?.latitude != null && d.location?.longitude != null
            ? `${d.location.latitude}, ${d.location.longitude}`
            : null,
        mediaUrl: null,
        mimeType: null,
        filename: null,
      };
    case "contact":
      return {
        contentType: "unsupported",
        text:
          [d.contact?.name, d.contact?.number].filter(Boolean).join(" — ") ||
          null,
        mediaUrl: null,
        mimeType: null,
        filename: null,
      };
    case "sticker":
      return {
        contentType: "sticker",
        text: null,
        mediaUrl: d.media?.url ?? null,
        mimeType: d.media?.mimeType ?? null,
        filename: null,
      };
    default:
      return {
        contentType: "unsupported",
        text: null,
        mediaUrl: null,
        mimeType: null,
        filename: null,
      };
  }
}

export async function handleMessageReceived(
  admin: AdminClient,
  ev: MessageReceivedEvent
): Promise<void> {
  if (ev.data.isGroup) return;

  // 1. Instância.
  const key = resolveInstanceKey(ev);
  const { data: instance } = await admin
    .from("wa_instances")
    .select("id, user_id")
    .eq("nextapi_instance_id", key)
    .maybeSingle();
  if (!instance) {
    console.warn(
      `[wa/webhook] message_received sem instância: chave='${key}'`
    );
    return;
  }

  // 2. Normalizar contraparte.
  const phone = digitsOnly(ev.data.phone);
  if (!phone || phone.length < 10) {
    console.warn(`[wa/webhook] telefone inválido: ${ev.data.phone}`);
    return;
  }
  const remoteJid = phoneToJid(phone) ?? `${phone}@s.whatsapp.net`;

  // 3. Get-or-create thread por (wa_instance_id, remote_jid).
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
      pushName: ev.data.senderName ?? null,
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

  // 4. Extrai conteúdo e (se mídia) re-hospeda.
  const extracted = extractMessage(ev);
  let mediaPath: string | null = null;
  let mediaMime: string | null = extracted.mimeType;
  let mediaSize: number | null = null;
  let contentType = extracted.contentType;

  if (
    extracted.mediaUrl &&
    contentType !== "text" &&
    contentType !== "location" &&
    contentType !== "unsupported"
  ) {
    const env = getWhatsAppEnv();
    try {
      const dl = await downloadInboundMedia(extracted.mediaUrl);
      if (dl.size > env.NEXTAPPS_MEDIA_MAX_BYTES) {
        console.warn(
          `[wa/webhook] mídia excede limite (${dl.size} bytes) — content_type=unsupported`
        );
        contentType = "unsupported";
      } else {
        mediaPath = await uploadChatMedia({
          admin,
          waInstanceId: instance.id,
          messageId: ev.data.messageId,
          bytes: dl.bytes,
          mimeType: extracted.mimeType ?? dl.contentType,
        });
        mediaMime = extracted.mimeType ?? dl.contentType;
        mediaSize = dl.size;
      }
    } catch (err) {
      console.error("[wa/webhook] falha ao baixar mídia", err);
      contentType = "unsupported";
    }
  }

  // 5. INSERT (idempotente via UNIQUE nextapi_message_id).
  const text = extracted.text;
  const fromMe = ev.data.fromMe;
  const direction = fromMe ? "outbound" : "inbound";
  const waTimestamp = timestampFromMoment(ev.data.momment).toISOString();

  const { data: inserted, error: insertErr } = await admin
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      nextapi_message_id: ev.data.messageId,
      direction,
      from_me: fromMe,
      content_type: contentType,
      text,
      media_path: mediaPath,
      media_mime_type: mediaMime,
      media_size_bytes: mediaSize,
      metadata: null as Json | null,
      wa_timestamp: waTimestamp,
    })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === "23505") return; // duplicate (idempotente)
    console.error("[wa/webhook] falha INSERT chat_messages", insertErr);
    return;
  }
  if (!inserted) return;

  // 6. Thread preview + unread.
  const preview =
    contentType === "text"
      ? previewFromText(text)
      : `[${contentType}]${text ? " " + previewFromText(text) : ""}`;

  const threadPatch: {
    last_message_at: string;
    last_message_preview: string;
    unread_count?: number;
  } = {
    last_message_at: waTimestamp,
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

  // 7. Notificação in-app (só inbound).
  if (direction === "inbound") {
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

    const link = linkFunilId ? `/crm/${linkFunilId}?lead=${leadId}` : `/perfil`;

    try {
      await sendInAppNotification(admin, {
        userIds: [instance.user_id],
        tipo: "chat_message_received",
        titulo: (ev.data.senderName ?? phone).trim() || phone,
        descricao: preview || "Nova mensagem",
        link,
        metadata: {
          lead_id: leadId,
          thread_id: threadId,
          card_id: linkCardId,
        } as Json,
      });
    } catch (err) {
      console.error("[wa/webhook] notificação falhou", err);
    }
  }
}
