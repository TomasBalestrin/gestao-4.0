import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
import { updateEtapaSchema } from "@/lib/schemas/etapa";
import { logEvent } from "@/lib/audit/logger";
import {
  ApiError,
  badRequest,
  conflict,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string; etapaId: string };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = updateEtapaSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nada para atualizar");
    }

    const { data: before } = await supabase
      .from("etapas")
      .select("*")
      .eq("id", params.etapaId)
      .eq("funil_id", params.id)
      .maybeSingle();
    if (!before) return notFound("Etapa não encontrada");

    const { data: after, error } = await supabase
      .from("etapas")
      .update(parsed.data)
      .eq("id", params.etapaId)
      .eq("funil_id", params.id)
      .select()
      .single();
    if (error || !after) {
      console.error("[PATCH /api/funis/[id]/etapas/[etapaId]]", error);
      throw new ApiError("INTERNAL", "Falha ao atualizar etapa");
    }

    await logEvent({
      entityType: "etapa",
      entityId: after.id,
      eventType: "etapa_updated",
      userId: user.id,
      before,
      after,
    });

    return ok(after);
  } catch (err) {
    return handleApiError(err, "PATCH /api/funis/[id]/etapas/[etapaId]");
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();

    const { data: before } = await supabase
      .from("etapas")
      .select("*")
      .eq("id", params.etapaId)
      .eq("funil_id", params.id)
      .maybeSingle();
    if (!before) return notFound("Etapa não encontrada");

    // FK cards.etapa_id é ON DELETE RESTRICT — bloqueia se houver cards.
    const { count, error: countError } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("etapa_id", params.etapaId);
    if (countError) {
      console.error("[DELETE etapa] count cards", countError);
      throw new ApiError("INTERNAL", "Falha ao verificar cards da etapa");
    }
    if ((count ?? 0) > 0) {
      return conflict("Etapa possui cards e não pode ser removida");
    }

    const { error } = await supabase
      .from("etapas")
      .delete()
      .eq("id", params.etapaId)
      .eq("funil_id", params.id);
    if (error) {
      console.error("[DELETE /api/funis/[id]/etapas/[etapaId]]", error);
      throw new ApiError("INTERNAL", "Falha ao remover etapa");
    }

    await logEvent({
      entityType: "etapa",
      entityId: params.etapaId,
      eventType: "etapa_deleted",
      userId: user.id,
      before,
      metadata: { funil_id: params.id },
    });

    return ok({ id: params.etapaId, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/funis/[id]/etapas/[etapaId]");
  }
}
