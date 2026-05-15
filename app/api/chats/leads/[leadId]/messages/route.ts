import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import {
  ApiError,
  badRequest,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { signChatMediaUrl } from "@/lib/whatsapp/media-storage";
import { listMessagesQuerySchema } from "@/lib/schemas/chat";
import type { ChatMessageWithMedia } from "@/types/domain";

export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { user, profile } = await requireAuth();
    const parsed = listMessagesQuerySchema.safeParse({
      cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return badRequest(parsed.error);

    const admin = createAdminClient();

    // Resolver lead.
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, nome, telefone")
      .eq("id", params.leadId)
      .is("deleted_at", null)
      .maybeSingle();
    if (leadErr) {
      console.error("[GET messages] erro lead", leadErr);
      throw new ApiError("INTERNAL", "Falha ao consultar lead");
    }
    if (!lead) return notFound("Lead não encontrado");

    // Resolver thread: user normal pega a própria; admin pega a mais recente.
    let threadQuery = admin
      .from("chat_threads")
      .select("id, wa_instance_id, unread_count, remote_jid, last_message_at")
      .eq("lead_id", params.leadId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1);

    if (profile.role !== "admin") {
      const { data: ownInstance } = await admin
        .from("wa_instances")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!ownInstance) {
        return ok({ messages: [], thread: null, can_send: false });
      }
      threadQuery = threadQuery.eq("wa_instance_id", ownInstance.id);
    }

    const { data: thread } = await threadQuery.maybeSingle();

    // can_send: só user normal com instância connected. Admin nunca envia.
    let canSend = false;
    if (profile.role !== "admin") {
      const { data: ownInstance } = await admin
        .from("wa_instances")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      canSend = ownInstance?.status === "connected";
    }

    if (!thread) {
      return ok({ messages: [], thread: null, can_send: canSend, lead });
    }

    let q = admin
      .from("chat_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("wa_timestamp", { ascending: false })
      .limit(parsed.data.limit);
    if (parsed.data.cursor) {
      q = q.lt("wa_timestamp", parsed.data.cursor);
    }

    const { data: rows, error } = await q;
    if (error) {
      console.error("[GET messages] erro listando", error);
      throw new ApiError("INTERNAL", "Falha ao listar mensagens");
    }

    const messages: ChatMessageWithMedia[] = [];
    for (const row of rows ?? []) {
      let mediaSignedUrl: string | null = null;
      if (row.media_path) {
        mediaSignedUrl = await signChatMediaUrl(admin, row.media_path);
      }
      messages.push({ ...row, media_signed_url: mediaSignedUrl });
    }

    return ok({
      messages: messages.reverse(),
      thread,
      can_send: canSend,
      lead,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/chats/leads/[leadId]/messages");
  }
}
