import { NextRequest } from "next/server";

import { requireAuth, requireAdmin } from "@/server/auth";
import { updateAutomacaoSchema } from "@/lib/schemas/automacao";
import type { Database, Json } from "@/lib/database.types";
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

type AutomacaoUpdate = Database["public"]["Tables"]["automacoes"]["Update"];

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("automacoes")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/automacoes/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar automação");
    }
    if (!data) return notFound("Automação não encontrada");
    return ok(data);
  } catch (err) {
    return handleApiError(err, "GET /api/automacoes/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = updateAutomacaoSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nada para atualizar");
    }

    const patch: AutomacaoUpdate = {};
    if (parsed.data.nome !== undefined) patch.nome = parsed.data.nome;
    if (parsed.data.ativo !== undefined) patch.ativo = parsed.data.ativo;
    if (parsed.data.ordem !== undefined) patch.ordem = parsed.data.ordem;
    if (parsed.data.notificacoes !== undefined) {
      patch.notificacoes = parsed.data.notificacoes as Json;
    }

    const { data, error } = await supabase
      .from("automacoes")
      .update(patch)
      .eq("id", params.id)
      .select()
      .maybeSingle();
    if (error) {
      console.error("[PATCH /api/automacoes/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao atualizar automação");
    }
    if (!data) return notFound("Automação não encontrada");
    return ok(data);
  } catch (err) {
    return handleApiError(err, "PATCH /api/automacoes/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const { data: before } = await supabase
      .from("automacoes")
      .select("id")
      .eq("id", params.id)
      .maybeSingle();
    if (!before) return notFound("Automação não encontrada");

    const { error } = await supabase
      .from("automacoes")
      .delete()
      .eq("id", params.id);
    if (error) {
      console.error("[DELETE /api/automacoes/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao remover automação");
    }
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/automacoes/[id]");
  }
}
