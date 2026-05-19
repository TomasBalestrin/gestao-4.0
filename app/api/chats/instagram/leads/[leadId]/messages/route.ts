import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ApiError,
  forbidden,
  handleApiError,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { leadId: string };
}

// GET /api/chats/instagram/leads/[leadId]/messages
// Lista mensagens da thread do IG pra esse lead.
// Retorna { messages, thread, can_send }.
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile } = await requireAuth();
    const admin = createAdminClient();

    // Resolve a thread do lead. Membros do funil tem acesso; admin enxerga.
    const { data: thread } = await admin
      .from("ig_threads")
      .select(
        `id, lead_id, ig_instance_id, ig_sender_psid, ig_sender_username,
         window_expires_at, last_message_at, last_message_preview, unread_count,
         instance:ig_instances(id, funil_id, ig_username, status)`
      )
      .eq("lead_id", params.leadId)
      .maybeSingle();

    if (!thread) {
      return ok({ messages: [], thread: null, can_send: false });
    }

    // Permissao: admin OU membro do funil da instancia.
    if (profile.role !== "admin") {
      const instance = thread.instance as unknown as
        | { funil_id: string }
        | null;
      if (!instance) return forbidden("sem permissao");
      const { data: membership } = await admin
        .from("user_funis")
        .select("user_id")
        .eq("funil_id", instance.funil_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership) return forbidden("sem permissao");
    }

    const limit = Math.min(
      Number(new URL(req.url).searchParams.get("limit") ?? 50),
      100
    );

    const { data: messages, error } = await admin
      .from("ig_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("ig_timestamp", { ascending: true })
      .limit(limit);
    if (error) {
      console.error("[ig/messages] select", error);
      throw new ApiError("INTERNAL", "Falha ao listar mensagens");
    }

    const now = Date.now();
    const canSend =
      ((thread.instance as unknown as { status?: string } | null)?.status ===
        "connected") &&
      !!thread.window_expires_at &&
      new Date(thread.window_expires_at).getTime() > now;

    return ok({
      messages: messages ?? [],
      thread: {
        id: thread.id,
        lead_id: thread.lead_id,
        window_expires_at: thread.window_expires_at,
        ig_sender_username: thread.ig_sender_username,
        last_message_at: thread.last_message_at,
        unread_count: thread.unread_count,
      },
      can_send: canSend,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/chats/instagram/leads/[leadId]/messages");
  }
}
