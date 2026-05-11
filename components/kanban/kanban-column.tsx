"use client";

import type { KanbanCardData } from "@/hooks/useCards";
import type { Etapa } from "@/types/domain";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { NewCardButton } from "@/components/kanban/new-card-button";

interface KanbanColumnProps {
  etapa: Pick<Etapa, "id" | "nome" | "cor" | "ordem">;
  cards: KanbanCardData[];
  onCardClick?: (cardId: string) => void;
}

export function KanbanColumn({ etapa, cards, onCardClick }: KanbanColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-secondary/30">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: etapa.cor }}
          />
          <span className="text-sm font-medium">{etapa.nome}</span>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            Nenhum card
          </p>
        ) : (
          cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))
        )}
      </div>

      <div className="border-t p-1">
        <NewCardButton etapaId={etapa.id} />
      </div>
    </div>
  );
}
