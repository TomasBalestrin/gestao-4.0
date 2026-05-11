import type { createClient } from "@/lib/supabase/server";
import type { AutomationResult } from "@/types/domain";

type AuthedClient = ReturnType<typeof createClient>;

const CARD_SELECT =
  "*, lead:leads(*), etapa:etapas(id, nome, cor, ordem), assigned:users!cards_assigned_to_fkey(id, nome, foto_url)";

export interface RunAutomationParams {
  supabase: AuthedClient;
  cardId: string;
  etapaId: string;
  ordemNaEtapa?: number;
  userId: string;
}

export interface RunAutomationOutcome {
  card: unknown; // card com lead/etapa/assigned (shape do CARD_SELECT)
  result: AutomationResult;
}

/**
 * MVP stub do engine de automação.
 * - Aplica a movimentação primária do card (etapa_id [+ ordem_na_etapa]).
 * - Ainda NÃO executa automações configuradas na etapa (move_to / duplicate_to,
 *   notificações). Substituir por engine real numa task posterior.
 */
export async function runAutomation({
  supabase,
  cardId,
  etapaId,
  ordemNaEtapa,
}: RunAutomationParams): Promise<RunAutomationOutcome> {
  const patch: { etapa_id: string; ordem_na_etapa?: number } = {
    etapa_id: etapaId,
  };
  if (ordemNaEtapa !== undefined) patch.ordem_na_etapa = ordemNaEtapa;

  const { data: card, error } = await supabase
    .from("cards")
    .update(patch)
    .eq("id", cardId)
    .is("deleted_at", null)
    .select(CARD_SELECT)
    .single();

  if (error || !card) {
    throw new Error(error?.message ?? "Falha ao mover card");
  }

  return { card, result: { success: true, executions: [] } };
}
