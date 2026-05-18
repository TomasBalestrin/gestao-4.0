"use client";

import { useDraggable } from "@dnd-kit/core";

import type { KanbanCardData } from "@/hooks/useCards";
import type { Etapa } from "@/types/domain";
import { cn } from "@/lib/utils/cn";
import { strongerColor, tintBg } from "@/lib/utils/etapa-style";
import { KanbanCard } from "@/components/kanban/kanban-card";

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
      className={cn(isDragging && "opacity-60 scale-[0.98]")}
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
  const bg = tintBg(etapa.cor, 0x33);
  const dot = strongerColor(etapa.cor);
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-[14px] border border-[color:var(--border-rgba)] bg-[var(--surface)]">
      <div
        className="flex items-center justify-between gap-2 rounded-t-[14px] border-b border-[color:var(--hairline)] px-3 py-2.5"
        style={bg ? { backgroundColor: bg } : undefined}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center"
          >
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
              style={{ backgroundColor: dot }}
            />
            <span
              className="relative inline-flex size-2 rounded-full ring-2 ring-background"
              style={{ backgroundColor: dot }}
            />
          </span>
          <span className="truncate text-[13px] font-medium uppercase tracking-wider text-foreground">{etapa.nome}</span>
        </div>
        <span className="rounded-pill bg-[var(--surface-elevated)] border border-[color:var(--border-strong)] px-2 py-0.5 font-mono text-[10px] text-text-secondary">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-[12px] text-text-muted">
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

    </div>
  );
}
