import { NextRequest } from "next/server";

import { requireAuth, requireCrmWrite } from "@/server/auth";
import { updateCardSchema } from "@/lib/schemas/card";
import { logEvent } from "@/lib/audit/logger";
import type { Database } from "@/lib/database.types";
import {
  ApiError,
  badRequest,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

interface RouteParams {
  params: { id: string };
}

const CARD_SELECT =
  "*, lead:leads(*), etapa:etapas(id, nome, cor, ordem), assigned:users!cards_assigned_to_fkey(id, nome, foto_url)";

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("cards")
      .select(CARD_SELECT)
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/cards/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar card");
    }
    if (!data) return notFound("Card não encontrado");
    return ok(data);
  } catch (err) {
    return handleApiError(err, "GET /api/cards/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireCrmWrite();

    const body = await req.json();
    const parsed = updateCardSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nada para atualizar");
    }

    const { data: before } = await supabase
      .from("cards")
      .select("id, assigned_to, ordem_na_etapa")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!before) return notFound("Card não encontrado");

    const patch: CardUpdate = {};
    if (parsed.data.assigned_to !== undefined) {
      patch.assigned_to = parsed.data.assigned_to;
    }
    if (parsed.data.ordem_na_etapa !== undefined) {
      patch.ordem_na_etapa = parsed.data.ordem_na_etapa;
    }

    const { data: after, error } = await supabase
      .from("cards")
      .update(patch)
      .eq("id", params.id)
      .select(CARD_SELECT)
      .single();
    if (error || !after) {
      console.error("[PATCH /api/cards/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao atualizar card");
    }

    await logEvent({
      entityType: "card",
      entityId: params.id,
      eventType: "card_updated",
      userId: user.id,
      before: { assigned_to: before.assigned_to },
      after: { assigned_to: after.assigned_to },
    });

    return ok(after);
  } catch (err) {
    return handleApiError(err, "PATCH /api/cards/[id]");
  }
}

// Soft delete: marca deleted_at.
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireCrmWrite();

    const { data: before } = await supabase
      .from("cards")
      .select("id, funil_id")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!before) return notFound("Card não encontrado");

    const { error } = await supabase
      .from("cards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.id);
    if (error) {
      console.error("[DELETE /api/cards/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao remover card");
    }

    await logEvent({
      entityType: "card",
      entityId: params.id,
      eventType: "card_deleted",
      userId: user.id,
      metadata: { funil_id: before.funil_id },
    });

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/cards/[id]");
  }
}
