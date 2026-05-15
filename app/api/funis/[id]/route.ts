import { NextRequest } from "next/server";

import { requireAuth, requireAdmin } from "@/server/auth";
import { updateFunilSchema } from "@/lib/schemas/funil";
import {
  ApiError,
  badRequest,
  errorResponse,
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
      .select("*, etapas!funil_id(*)")
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

    const update: typeof parsed.data = { ...parsed.data };

    // Validação cross-field do agendamento de call:
    // - origem precisa ser sdr ou social_selling;
    // - destino precisa ser um funil de closer;
    // - etapa destino precisa pertencer ao funil destino.
    // Quando desabilitado, limpa os destinos para não deixar config órfã.
    if (update.agenda_call_enabled === true) {
      const { data: current } = await supabase
        .from("funis")
        .select("role_alvo")
        .eq("id", params.id)
        .maybeSingle();
      if (!current) return notFound("Funil não encontrado");

      const roleAlvo = update.role_alvo ?? current.role_alvo;
      if (roleAlvo !== "sdr" && roleAlvo !== "social_selling") {
        return errorResponse(
          "BUSINESS_RULE",
          "Agendamento de call só pode ser habilitado em funis de SDR ou Social Selling"
        );
      }

      if (!update.funil_destino_id || !update.etapa_destino_id) {
        return badRequest("Funil e etapa de destino são obrigatórios");
      }

      if (update.funil_destino_id === params.id) {
        return badRequest("Funil de destino não pode ser o próprio funil");
      }

      const { data: destino } = await supabase
        .from("funis")
        .select("id, role_alvo")
        .eq("id", update.funil_destino_id)
        .maybeSingle();
      if (!destino) return badRequest("Funil de destino inválido");
      if (destino.role_alvo !== "closer") {
        return errorResponse(
          "BUSINESS_RULE",
          "Funil de destino deve ser de Closer"
        );
      }

      const { data: etapaDestino } = await supabase
        .from("etapas")
        .select("id, funil_id")
        .eq("id", update.etapa_destino_id)
        .maybeSingle();
      if (!etapaDestino || etapaDestino.funil_id !== update.funil_destino_id) {
        return badRequest("Etapa de destino não pertence ao funil de destino");
      }
    } else if (update.agenda_call_enabled === false) {
      update.funil_destino_id = null;
      update.etapa_destino_id = null;
    }

    const { data, error } = await supabase
      .from("funis")
      .update(update)
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
