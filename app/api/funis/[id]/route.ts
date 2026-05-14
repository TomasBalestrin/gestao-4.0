import { NextRequest } from "next/server";

import { requireAuth, requireAdmin } from "@/server/auth";
import { updateFunilSchema } from "@/lib/schemas/funil";
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

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("funis")
      .select("*, etapas(*)")
      .eq("id", params.id)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/funis/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar funil");
    }
    if (!data) return notFound("Funil não encontrado");

    const etapas = Array.isArray(data.etapas)
      ? [...data.etapas].sort((a, b) => a.ordem - b.ordem)
      : [];

    return ok({ ...data, etapas });
  } catch (err) {
    return handleApiError(err, "GET /api/funis/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = updateFunilSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nada para atualizar");
    }

    const { data, error } = await supabase
      .from("funis")
      .update(parsed.data)
      .eq("id", params.id)
      .select()
      .maybeSingle();
    if (error) {
      console.error("[PATCH /api/funis/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao atualizar funil");
    }
    if (!data) return notFound("Funil não encontrado");

    return ok(data);
  } catch (err) {
    return handleApiError(err, "PATCH /api/funis/[id]");
  }
}

// Hard delete: remove o funil de fato. As FKs em etapas, cards, user_funis,
// automacoes etc. têm ON DELETE CASCADE, então tudo do funil vai junto.
// Para apenas arquivar, use PATCH com { is_archived: true }.
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const { data: existing } = await supabase
      .from("funis")
      .select("id")
      .eq("id", params.id)
      .maybeSingle();
    if (!existing) return notFound("Funil não encontrado");

    const { error } = await supabase
      .from("funis")
      .delete()
      .eq("id", params.id);
    if (error) {
      console.error("[DELETE /api/funis/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao excluir funil");
    }

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/funis/[id]");
  }
}
