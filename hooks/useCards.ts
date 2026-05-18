import { useQuery } from "@tanstack/react-query";

import type { Card, Lead } from "@/types/domain";

export interface KanbanCardData extends Card {
  lead: Lead;
  etapa: { id: string; nome: string; cor: string; ordem: number } | null;
  assigned: { id: string; nome: string; foto_url: string | null } | null;
  automation_errors?: { id: string; resolved_at: string | null }[];
}

export const cardsKeys = {
  byFunil: (funilId: string) => ["cards", funilId] as const,
};

// Mesma projeção usada no server prefetch e no route handler (mantenha sincronizado).
export const CARD_SELECT =
  "*, lead:leads(*), etapa:etapas(id, nome, cor, ordem), assigned:users!cards_assigned_to_fkey(id, nome, foto_url), automation_errors(id, resolved_at)";

export function hasUnresolvedAutomationError(card: KanbanCardData): boolean {
  return (card.automation_errors ?? []).some((e) => e.resolved_at === null);
}

async function fetchCards(funilId: string): Promise<KanbanCardData[]> {
  const res = await fetch(`/api/funis/${funilId}/cards`);
  const body = (await res.json().catch(() => null)) as
    | { data?: KanbanCardData[]; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data ?? [];
}

export function useCards(funilId: string) {
  return useQuery({
    queryKey: cardsKeys.byFunil(funilId),
    queryFn: () => fetchCards(funilId),
    staleTime: 10_000,
  });
}
