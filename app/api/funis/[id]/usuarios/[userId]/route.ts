import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
import {
  ApiError,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string; userId: string };
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const { data: existing } = await supabase
      .from("user_funis")
      .select("user_id, funil_id")
      .eq("funil_id", params.id)
      .eq("user_id", params.userId)
      .maybeSingle();
    if (!existing) return notFound("Acesso não encontrado");

    const { error } = await supabase
      .from("user_funis")
      .delete()
      .eq("funil_id", params.id)
      .eq("user_id", params.userId);
    if (error) {
      console.error("[DELETE /api/funis/[id]/usuarios/[userId]]", error);
      throw new ApiError("INTERNAL", "Falha ao remover acesso");
    }
    return ok({ user_id: params.userId, funil_id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/funis/[id]/usuarios/[userId]");
  }
}
