import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { runAutomation } from "@/lib/automation/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit/logger";
import {
  errorResponse,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth();

    const { data: errRow } = await supabase
      .from("automation_errors")
      .select("id, card_id, resolved_at, retry_count")
      .eq("id", params.id)
      .maybeSingle();
    if (!errRow) return notFound("Erro de automação não encontrado");
    if (!errRow.card_id) {
      return errorResponse("BUSINESS_RULE", "Erro sem card associado");
    }
    if (errRow.resolved_at) {
      return ok({ id: errRow.id, alreadyResolved: true });
    }

    const { data: card } = await supabase
      .from("cards")
      .select("id, etapa_id")
      .eq("id", errRow.card_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!card) return notFound("Card não encontrado");

    const { result } = await runAutomation({
      supabase,
      cardId: card.id,
      etapaId: card.etapa_id,
      userId: user.id,
    });

    const admin = createAdminClient();
    const nextRetryCount = (errRow.retry_count ?? 0) + 1;

    if (result.success) {
      await admin
        .from("automation_errors")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          retry_count: nextRetryCount,
        })
        .eq("id", errRow.id);
      await logEvent({
        entityType: "card",
        entityId: card.id,
        eventType: "automation_executed",
        userId: user.id,
        metadata: { retry_of: errRow.id },
      });
      return ok({ id: errRow.id, resolved: true, automationResult: result });
    }

    await admin
      .from("automation_errors")
      .update({ retry_count: nextRetryCount })
      .eq("id", errRow.id);
    return errorResponse("AUTOMATION_FAILED", "Automação falhou novamente", {
      automation_error_id: result.automation_error_id,
      automationResult: result,
    });
  } catch (err) {
    return handleApiError(err, "POST /api/automation-errors/[id]/retry");
  }
}
