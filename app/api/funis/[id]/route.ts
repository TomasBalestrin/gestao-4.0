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

// Soft delete: arquiva o funil (is_archived = true).
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
      .from("funis")
      .update({ is_archived: true })
      .eq("id", params.id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[DELETE /api/funis/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao arquivar funil");
    }
    if (!data) return notFound("Funil não encontrado");

    return ok({ id: data.id, archived: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/funis/[id]");
  }
}
