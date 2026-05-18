import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { updateFollowUpSchema } from "@/lib/schemas/follow-up";
import {
  ApiError,
  badRequest,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

// PATCH /api/follow-ups/[id]
// Marca como feito (`done_at: now()`) ou atualiza `due_date`. Quando o body
// vem vazio, marca como feito por padrao (atalho do botao "Marcar feito").
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const raw = await req.json().catch(() => ({}));
    const parsed = updateFollowUpSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);

    const patch: {
      due_date?: string;
      done_at?: string | null;
    } = {};
    if (parsed.data.due_date !== undefined) patch.due_date = parsed.data.due_date;
    if (parsed.data.done_at !== undefined) patch.done_at = parsed.data.done_at;
    // Default: marcar feito agora.
    if (Object.keys(patch).length === 0) {
      patch.done_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .update(patch)
      .eq("id", params.id)
      .select("id, card_id, user_id, due_date, done_at, created_at")
      .maybeSingle();
    if (error) {
      console.error("[PATCH /api/follow-ups/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao atualizar follow-up");
    }
    if (!data) return notFound("Follow-up nao encontrado");
    return ok(data);
  } catch (err) {
    return handleApiError(err, "PATCH /api/follow-ups/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { error } = await supabase
      .from("follow_ups")
      .delete()
      .eq("id", params.id);
    if (error) {
      console.error("[DELETE /api/follow-ups/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao remover follow-up");
    }
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/follow-ups/[id]");
  }
}
