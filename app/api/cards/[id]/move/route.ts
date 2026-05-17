import { NextRequest } from "next/server";

import { requireCrmMove } from "@/server/auth";
import { moveCardSchema } from "@/lib/schemas/card";
import { runAutomation } from "@/lib/automation/engine";
import { logEvent } from "@/lib/audit/logger";
import {
  badRequest,
  errorResponse,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireCrmMove();

    const body = await req.json();
    const parsed = moveCardSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { data: before } = await supabase
      .from("cards")
      .select("id, funil_id, etapa_id")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!before) return notFound("Card não encontrado");

    const { data: targetEtapa } = await supabase
      .from("etapas")
      .select("id, funil_id")
      .eq("id", parsed.data.etapa_id)
      .maybeSingle();
    if (!targetEtapa || targetEtapa.funil_id !== before.funil_id) {
      return badRequest("Etapa inválida para este funil");
    }

    const { card, result } = await runAutomation({
      supabase,
      cardId: params.id,
      etapaId: parsed.data.etapa_id,
      ordemNaEtapa: parsed.data.ordem_na_etapa,
      userId: user.id,
    });

    if (before.etapa_id !== parsed.data.etapa_id) {
      await logEvent({
        entityType: "card",
        entityId: params.id,
        eventType: "card_moved",
        userId: user.id,
        before: { etapa_id: before.etapa_id },
        after: { etapa_id: parsed.data.etapa_id },
        metadata: { funil_id: before.funil_id },
      });
    }

    if (!result.success) {
      return errorResponse("AUTOMATION_FAILED", "Falha em automação", {
        automation_error_id: result.automation_error_id,
        automationResult: result,
      });
    }

    return ok({ card, automationResult: result });
  } catch (err) {
    return handleApiError(err, "POST /api/cards/[id]/move");
  }
}
