import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import {
  ApiError,
  badRequest,
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextSchema } from "@/lib/schemas/chat";
import { phoneToJid } from "@/lib/whatsapp/phone";
import {
  sendText,
  sendMedia,
  NextApiError,
} from "@/lib/whatsapp/nextapi-client";
import { uploadChatMedia } from "@/lib/whatsapp/media-storage";
import { getWhatsAppEnv } from "@/lib/whatsapp/env";
import type { ChatContentType, Json } from "@/lib/database.types";

function contentTypeFromMime(mime: string): ChatContentType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

function previewFromText(text: string | null | undefined, max = 80): string {
  if (!text) return "";
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > max ? single.slice(0, max - 1) + "…" : single;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { user, profile } = await requireAuth();
    if (profile.role === "admin") {
      return forbidden("Admin não envia mensagens (somente leitura)");
    }

    const admin = createAdminClient();

    const { data: instance } = await admin
      .from("wa_instances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!instance || instance.status !== "connected") {
      return forbidden("Sua instância de WhatsApp não está conectada");
    }

    const { data: lead } = await admin
      .from("leads")
      .select("id, telefone")
      .eq("id", params.leadId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!lead) return notFound("Lead não encontrado");
    if (!lead.telefone) {
      throw new ApiError("BUSINESS_RULE", "Lead sem telefone cadastrado");
    }

    const toJid = phoneToJid(lead.telefone);
    if (!toJid) {
      throw new ApiError("BUSINESS_RULE", "Telefone do lead inválido");
    }

    // Get-or-create thread (UNIQUE lead_id + wa_instance_id).
    let { data: thread } = await admin
      .from("chat_threads")
      .select("id")
      .eq("wa_instance_id", instance.id)
      .eq("lead_id", lead.id)
      .maybeSingle();
    if (!thread) {
      const { data: created, error: createErr } = await admin
        .from("chat_threads")
        .insert({
          lead_id: lead.id,
          wa_instance_id: instance.id,
          remote_jid: toJid,
        })
        .select("id")
        .single();
      if (createErr || !created) {
        console.error("[send] falha criando thread", createErr);
        throw new ApiError("INTERNAL", "Falha ao criar thread");
      }
      thread = created;
    }

    const ct = req.headers.get("content-type") ?? "";
    let mediaInsert: {
      content_type: ChatContentType;
      text: string | null;
      media_path: string | null;
      media_mime_type: string | null;
      media_size_bytes: number | null;
      preview: string;
    } | null = null;

    let messageId: string;

    if (ct.includes("multipart/form-data")) {
      const env = getWhatsAppEnv();
      const form = await req.formData();
      const file = form.get("file");
      const captionRaw = form.get("caption");
      const caption = typeof captionRaw === "string" ? captionRaw : null;
      if (!(file instanceof File)) {
        throw new ApiError("VALIDATION", "Arquivo ausente");
      }
      if (file.size > env.NEXTAPI_MEDIA_MAX_BYTES) {
        throw new ApiError("BUSINESS_RULE", "Arquivo excede tamanho permitido");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const base64 = Buffer.from(bytes).toString("base64");
      const mime = file.type || "application/octet-stream";
      const contentType = contentTypeFromMime(mime);

      let result;
      try {
        result = await sendMedia({
          instanceId: instance.nextapi_instance_id,
          instanceToken: instance.nextapi_instance_token,
          toJid,
          mediaBase64: base64,
          mimeType: mime,
          filename: file.name,
          caption: caption ?? undefined,
          contentType: contentType === "sticker" || contentType === "location" || contentType === "text" || contentType === "unsupported"
            ? "document"
            : contentType,
        });
      } catch (err) {
        if (err instanceof NextApiError) {
          await admin.from("chat_messages").insert({
            thread_id: thread.id,
            direction: "outbound",
            from_me: true,
            content_type: contentType,
            text: caption,
            wa_timestamp: new Date().toISOString(),
            failed_reason: err.message,
          });
          throw new ApiError("BUSINESS_RULE", "Falha ao enviar mídia pelo provider");
        }
        throw err;
      }
      messageId = result.messageId;

      const mediaPath = await uploadChatMedia({
        admin,
        waInstanceId: instance.id,
        messageId,
        bytes,
        mimeType: mime,
      });
      mediaInsert = {
        content_type: contentType,
        text: caption,
        media_path: mediaPath,
        media_mime_type: mime,
        media_size_bytes: bytes.byteLength,
        preview: `[${contentType}]${caption ? " " + previewFromText(caption) : ""}`,
      };
    } else {
      const body = await req.json();
      const parsed = sendTextSchema.safeParse(body);
      if (!parsed.success) return badRequest(parsed.error);
      try {
        const result = await sendText({
          instanceId: instance.nextapi_instance_id,
          instanceToken: instance.nextapi_instance_token,
          toJid,
          text: parsed.data.text,
        });
        messageId = result.messageId;
      } catch (err) {
        if (err instanceof NextApiError) {
          await admin.from("chat_messages").insert({
            thread_id: thread.id,
            direction: "outbound",
            from_me: true,
            content_type: "text",
            text: parsed.data.text,
            wa_timestamp: new Date().toISOString(),
            failed_reason: err.message,
          });
          throw new ApiError("BUSINESS_RULE", "Falha ao enviar texto pelo provider");
        }
        throw err;
      }
      mediaInsert = {
        content_type: "text",
        text: parsed.data.text,
        media_path: null,
        media_mime_type: null,
        media_size_bytes: null,
        preview: previewFromText(parsed.data.text),
      };
    }

    const wa_timestamp = new Date().toISOString();
    const { data: inserted, error: insertErr } = await admin
      .from("chat_messages")
      .insert({
        thread_id: thread.id,
        nextapi_message_id: messageId,
        direction: "outbound",
        from_me: true,
        content_type: mediaInsert.content_type,
        text: mediaInsert.text,
        media_path: mediaInsert.media_path,
        media_mime_type: mediaInsert.media_mime_type,
        media_size_bytes: mediaInsert.media_size_bytes,
        wa_timestamp,
        metadata: null as Json | null,
      })
      .select("*")
      .single();
    if (insertErr || !inserted) {
      console.error("[send] falha INSERT chat_messages", insertErr);
      throw new ApiError("INTERNAL", "Falha ao registrar mensagem");
    }

    await admin
      .from("chat_threads")
      .update({
        last_message_at: wa_timestamp,
        last_message_preview: mediaInsert.preview,
      })
      .eq("id", thread.id);

    return ok({ message: inserted });
  } catch (err) {
    return handleApiError(err, "POST /api/chats/leads/[leadId]/send");
  }
}
