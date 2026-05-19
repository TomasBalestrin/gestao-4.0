import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendInAppNotification } from "@/lib/automation/notifications";
import { getUserProfile } from "@/lib/instagram/graph-client";
import { getOrCreateIgInboundChain } from "@/lib/instagram/lead-resolver";
import type { IgContentType, Json } from "@/lib/database.types";

// Meta envia eventos no formato:
// {
//   object: "instagram",
//   entry: [{
//     id: "<page_id>",
//     time: 1234567890,
//     messaging: [{
//       sender: { id: "<psid>" },
//       recipient: { id: "<ig_user_id>" },
//       timestamp: 1234567890,
//       message: { mid: "...", text: "..." } | { attachments: [...] } | ...
//     }]
//   }]
// }

const messagingItemSchema = z.object({
  sender: z.object({ id: z.string() }),
  recipient: z.object({ id: z.string() }),
  timestamp: z.number().optional(),
  message: z
    .object({
      mid: z.string().optional(),
      text: z.string().optional(),
      attachments: z
        .array(
          z.object({
            type: z.string(),
            payload: z.record(z.string(), z.unknown()).optional(),
          })
        )
        .optional(),
      reply_to: z.record(z.string(), z.unknown()).optional(),
      is_echo: z.boolean().optional(),
    })
    .optional(),
  postback: z
    .object({
      mid: z.string().optional(),
      payload: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
  reaction: z
    .object({
      mid: z.string().optional(),
      action: z.string(),
      emoji: z.string().optional(),
    })
    .optional(),
});

export const webhookEventSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      time: z.number().optional(),
      messaging: z.array(messagingItemSchema).optional(),
    })
  ),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

const WINDOW_24H_MS = 24 * 60 * 60 * 1000;

function detectContentType(
  attachments: { type: string }[] | undefined,
  hasText: boolean
): { contentType: IgContentType; preview: string } {
  if (hasText) return { contentType: "text", preview: "" };
  if (!attachments || attachments.length === 0) {
    return { contentType: "unsupported", preview: "[mensagem]" };
  }
  const first = attachments[0]!;
  switch (first.type) {
    case "image":
      return { contentType: "image", preview: "[imagem]" };
    case "audio":
      return { contentType: "audio", preview: "[audio]" };
    case "video":
      return { contentType: "video", preview: "[video]" };
    case "share":
      return { contentType: "share", preview: "[compartilhado]" };
    case "story_mention":
    case "story_reply":
      return { contentType: "story_reply", preview: "[story]" };
    default:
      return { contentType: "unsupported", preview: "[mensagem]" };
  }
}

export async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  if (event.object !== "instagram") return;
  const admin = createAdminClient();

  for (const entry of event.entry) {
    for (const item of entry.messaging ?? []) {
      // Ignora echos (mensagens que nos mesmos enviamos via API e estao
      // sendo refletidas pelo webhook).
      if (item.message?.is_echo) continue;
      // Reactions e postbacks ficam fora do MVP.
      if (!item.message) continue;

      try {
        await handleInboundMessage(admin, item);
      } catch (err) {
        console.error("[ig/webhook] erro processando mensagem", err);
      }
    }
  }
}

async function handleInboundMessage(
  admin: ReturnType<typeof createAdminClient>,
  item: z.infer<typeof messagingItemSchema>
): Promise<void> {
  const recipientId = item.recipient.id;
  const senderPsid = item.sender.id;

  // 1. Resolve instancia pelo recipient_id.
  const { data: instance } = await admin
    .from("ig_instances")
    .select("id, funil_id, ig_user_id, access_token")
    .eq("ig_user_id", recipientId)
    .eq("status", "connected")
    .maybeSingle();
  if (!instance) {
    console.warn(
      "[ig/webhook] instancia nao encontrada pra recipient",
      recipientId
    );
    return;
  }

  // 2. Tenta enriquecer com username/name do PSID (best-effort, falha tudo bem).
  let senderUsername: string | null = null;
  let senderName: string | null = null;
  try {
    const profile = await getUserProfile({
      accessToken: instance.access_token,
      psid: senderPsid,
    });
    senderUsername = profile.username ?? null;
    senderName = profile.name ?? null;
  } catch (err) {
    console.warn("[ig/webhook] getUserProfile falhou", err);
  }

  // 3. Get-or-create thread + lead + card.
  const chain = await getOrCreateIgInboundChain(admin, {
    funilId: instance.funil_id,
    igInstanceId: instance.id,
    senderPsid,
    senderUsername,
    senderName,
    igUserIdOfInstance: instance.ig_user_id,
  });
  if (!chain) return;

  // 4. Extrai conteudo.
  const text = item.message?.text ?? null;
  const attachments = item.message?.attachments;
  const { contentType, preview } = detectContentType(attachments, !!text);
  const mediaUrl =
    attachments?.[0]?.payload &&
    typeof (attachments[0].payload as Record<string, unknown>).url === "string"
      ? ((attachments[0].payload as Record<string, unknown>).url as string)
      : null;

  // 5. Insere mensagem (idempotente via meta_message_id).
  const metaMessageId = item.message?.mid ?? null;
  const igTimestamp = item.timestamp
    ? new Date(item.timestamp).toISOString()
    : new Date().toISOString();

  const { error: insertErr } = await admin.from("ig_messages").insert({
    thread_id: chain.threadId,
    meta_message_id: metaMessageId,
    direction: "inbound",
    from_me: false,
    content_type: contentType,
    text,
    media_url: mediaUrl,
    payload: attachments ? ({ attachments } as unknown as Json) : null,
    ig_timestamp: igTimestamp,
  });
  if (insertErr && insertErr.code !== "23505") {
    // 23505 = unique_violation. Idempotencia OK; outros sao erros reais.
    console.error("[ig/webhook] insert message error", insertErr);
    return;
  }
  if (insertErr?.code === "23505") return;

  // 6. Atualiza thread: window_expires_at, last_message_*, unread.
  const windowExpiresAt = new Date(Date.now() + WINDOW_24H_MS).toISOString();
  const messagePreview = text ?? preview;
  await admin
    .from("ig_threads")
    .update({
      window_expires_at: windowExpiresAt,
      last_message_at: igTimestamp,
      last_message_preview: messagePreview.slice(0, 140),
      unread_count: 1, // bump simples; UI zera ao abrir
    })
    .eq("id", chain.threadId);

  // 7. Notifica membros do funil.
  const { data: members } = await admin
    .from("user_funis")
    .select("user_id")
    .eq("funil_id", instance.funil_id);

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length > 0) {
    try {
      await sendInAppNotification(admin, {
        userIds,
        tipo: "chat_message_received",
        titulo: senderName || senderUsername || "Nova mensagem no Instagram",
        descricao: text ?? preview,
        link: `/crm/${instance.funil_id}?card=${chain.cardId}&pane=instagram`,
      });
    } catch (err) {
      console.warn("[ig/webhook] notif falhou", err);
    }
  }
}
