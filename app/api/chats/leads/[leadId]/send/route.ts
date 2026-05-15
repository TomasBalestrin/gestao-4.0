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
import { digitsOnly, phoneToJid } from "@/lib/whatsapp/phone";
import {
  sendText,
  sendImage,
  NextApiError,
} from "@/lib/whatsapp/nextapi-client";
import {
  uploadChatMedia,
  signChatMediaUrl,
} from "@/lib/whatsapp/media-storage";
import { getWhatsAppEnv } from "@/lib/whatsapp/env";
import type { ChatContentType, Json } from "@/lib/database.types";

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
    const toPhone = digitsOnly(lead.telefone);
    if (!toJid || toPhone.length < 10) {
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

    let contentType: ChatContentType;
    let textForRecord: string | null;
    let mediaPath: string | null = null;
    let mediaMime: string | null = null;
    let mediaSize: number | null = null;
    let messageId: string | undefined;

    if (ct.includes("multipart/form-data")) {
      const env = getWhatsAppEnv();
      const form = await req.formData();
      const file = form.get("file");
      const captionRaw = form.get("caption");
      const caption = typeof captionRaw === "string" ? captionRaw : null;
      if (!(file instanceof File)) {
        throw new ApiError("VALIDATION", "Arquivo ausente");
      }
      if (!file.type.startsWith("image/")) {
        throw new ApiError(
          "BUSINESS_RULE",
          "Provider só permite envio de texto e imagem"
        );
      }
      if (file.size > env.NEXTAPPS_MEDIA_MAX_BYTES) {
        throw new ApiError("BUSINESS_RULE", "Arquivo excede tamanho permitido");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = file.type;
      contentType = "image";
      textForRecord = caption;
      mediaMime = mime;
      mediaSize = bytes.byteLength;

      // 1) hospeda primeiro (precisamos da URL pra mandar pro provider).
      const localMessageId = `out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      mediaPath = await uploadChatMedia({
        admin,
        waInstanceId: instance.id,
        messageId: localMessageId,
        bytes,
        mimeType: mime,
      });
      const signed = await signChatMediaUrl(admin, mediaPath);
      if (!signed) {
        throw new ApiError("INTERNAL", "Falha gerando URL assinada da imagem");
      }

      // 2) manda pro provider.
      try {
        const result = await sendImage({
          instanceId: instance.nextapi_instance_id,
          phone: toPhone,
          message: caption ?? "",
          imageUrl: signed,
        });
        messageId = result.messageId;
      } catch (err) {
        if (err instanceof NextApiError) {
          await admin.from("chat_messages").insert({
            thread_id: thread.id,
            direction: "outbound",
            from_me: true,
            content_type: "image",
            text: caption,
            media_path: mediaPath,
            media_mime_type: mediaMime,
            media_size_bytes: mediaSize,
            wa_timestamp: new Date().toISOString(),
            failed_reason: err.message,
          });
          throw new ApiError(
            "BUSINESS_RULE",
            "Falha ao enviar imagem pelo provider"
          );
        }
        throw err;
      }
    } else {
      const body = await req.json();
      const parsed = sendTextSchema.safeParse(body);
      if (!parsed.success) return badRequest(parsed.error);
      contentType = "text";
      textForRecord = parsed.data.text;
      try {
        const result = await sendText({
          instanceId: instance.nextapi_instance_id,
          phone: toPhone,
          message: parsed.data.text,
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
          throw new ApiError(
            "BUSINESS_RULE",
            "Falha ao enviar texto pelo provider"
          );
        }
        throw err;
      }
    }

    const wa_timestamp = new Date().toISOString();
    const preview =
      contentType === "text"
        ? previewFromText(textForRecord)
        : `[image]${textForRecord ? " " + previewFromText(textForRecord) : ""}`;

    const { data: inserted, error: insertErr } = await admin
      .from("chat_messages")
      .insert({
        thread_id: thread.id,
        nextapi_message_id: messageId ?? null,
        direction: "outbound",
        from_me: true,
        content_type: contentType,
        text: textForRecord,
        media_path: mediaPath,
        media_mime_type: mediaMime,
        media_size_bytes: mediaSize,
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
        last_message_preview: preview,
      })
      .eq("id", thread.id);

    return ok({ message: inserted });
  } catch (err) {
    return handleApiError(err, "POST /api/chats/leads/[leadId]/send");
  }
}
