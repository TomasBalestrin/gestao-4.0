"use client";

import { useMemo } from "react";

import type { Etapa } from "@/types/domain";
import { useCards } from "@/hooks/useCards";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn } from "@/components/kanban/kanban-column";

interface KanbanBoardProps {
  funilId: string;
  etapas: Pick<Etapa, "id" | "nome" | "cor" | "ordem">[];
}

export function KanbanBoard({ funilId, etapas }: KanbanBoardProps) {
  const { data: cards, isLoading, isError, error } = useCards(funilId);
  const openCard = useKanbanStore((s) => s.openCard);

  const sortedEtapas = useMemo(
    () => [...etapas].sort((a, b) => a.ordem - b.ordem),
    [etapas]
  );

  const cardsByEtapa = useMemo(() => {
    const map = new Map<string, NonNullable<typeof cards>>();
    for (const e of sortedEtapas) map.set(e.id, []);
    for (const card of cards ?? []) {
      const arr = map.get(card.etapa_id);
      if (arr) arr.push(card);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.ordem_na_etapa - b.ordem_na_etapa);
    }
    return map;
  }, [cards, sortedEtapas]);

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Falha ao carregar o kanban: {(error as Error).message}
      </p>
    );
  }

  if (sortedEtapas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este funil ainda não tem etapas configuradas.
      </p>
    );
  }

  const totalCards = cards?.length ?? 0;
  const showEmptyHint = !isLoading && totalCards === 0;

  return (
    <div className="space-y-3">
      {showEmptyHint && (
        <p className="text-sm text-muted-foreground">
          Nenhum card neste funil. Use “Novo card” em qualquer coluna para
          começar.
        </p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sortedEtapas.map((etapa) =>
          isLoading ? (
            <div
              key={etapa.id}
              className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border bg-secondary/30 p-2"
            >
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              cards={cardsByEtapa.get(etapa.id) ?? []}
              onCardClick={openCard}
            />
          )
        )}
      </div>
    </div>
  );
}
