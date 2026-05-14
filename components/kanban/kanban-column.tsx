"use client";

import { useDraggable } from "@dnd-kit/core";

import type { KanbanCardData } from "@/hooks/useCards";
import type { Etapa } from "@/types/domain";
import { cn } from "@/lib/utils/cn";
import { etapaIcon, tintBg } from "@/lib/utils/etapa-style";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { NewCardButton } from "@/components/kanban/new-card-button";

interface KanbanColumnProps {
  etapa: Pick<Etapa, "id" | "nome" | "cor" | "ordem">;
  cards: KanbanCardData[];
  onCardClick?: (cardId: string) => void;
  readOnly?: boolean;
}

function DraggableCard({
  card,
  onClick,
  readOnly,
}: {
  card: KanbanCardData;
  onClick?: (cardId: string) => void;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: { etapaId: card.etapa_id },
      disabled: readOnly,
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: "none",
      }}
      className={cn(isDragging && "opacity-50")}
      {...(readOnly ? {} : listeners)}
      {...(readOnly ? {} : attributes)}
    >
      <KanbanCard card={card} onClick={onClick} />
    </div>
  );
}

export function KanbanColumn({
  etapa,
  cards,
  onCardClick,
  readOnly,
}: KanbanColumnProps) {
  const Icon = etapaIcon(etapa.ordem - 1);
  const bg = tintBg(etapa.cor, 0x33);
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-secondary/30">
      <div
        className="flex items-center justify-between gap-2 rounded-t-lg border-b px-3 py-2"
        style={bg ? { backgroundColor: bg } : undefined}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" style={{ color: etapa.cor }} />
          <span className="truncate text-sm font-medium">{etapa.nome}</span>
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
            <DraggableCard
              key={card.id}
              card={card}
              onClick={onCardClick}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {!readOnly && (
        <div className="border-t p-1">
          <NewCardButton etapaId={etapa.id} />
        </div>
      )}
    </div>
  );
}
