"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import type { Etapa } from "@/types/domain";
import { cn } from "@/lib/utils/cn";
import { useCards } from "@/hooks/useCards";
import { useMoveCard } from "@/hooks/useMoveCard";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { canMoveCards, isCloser } from "@/lib/utils/permissions";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { KanbanSkeleton } from "@/components/shared/loading-spinner";
import { KanbanColumn } from "@/components/kanban/kanban-column";

interface KanbanBoardProps {
  funilId: string;
  etapas: Pick<Etapa, "id" | "nome" | "cor" | "ordem">[];
}

function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-shadow",
        isOver && "ring-2 ring-foreground/30"
      )}
    >
      {children}
    </div>
  );
}

export function KanbanBoard({ funilId, etapas }: KanbanBoardProps) {
  const { role } = useCurrentUser();
  const readOnly = isCloser(role);
  const canMove = canMoveCards(role);
  const { data: cards, isLoading, isError, error } = useCards(funilId);
  const openCard = useKanbanStore((s) => s.openCard);
  const moveCard = useMoveCard();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

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

  function handleDragEnd(event: DragEndEvent) {
    if (!canMove) return;
    const { active, over } = event;
    if (!over) return;
    const targetEtapaId = String(over.id);
    const sourceEtapaId = active.data.current?.etapaId as string | undefined;
    if (!sourceEtapaId || sourceEtapaId === targetEtapaId) return;
    if (!sortedEtapas.some((e) => e.id === targetEtapaId)) return;
    moveCard.mutate({
      cardId: String(active.id),
      funilId,
      etapaId: targetEtapaId,
    });
  }

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
          {readOnly
            ? "Nenhum card neste funil ainda."
            : "Nenhum card neste funil. Use “Novo card” em qualquer coluna para começar."}
        </p>
      )}

      {isLoading ? (
        <KanbanSkeleton columns={sortedEtapas.length} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sortedEtapas.map((etapa) => (
              <DroppableColumn key={etapa.id} id={etapa.id}>
                <KanbanColumn
                  etapa={etapa}
                  cards={cardsByEtapa.get(etapa.id) ?? []}
                  onCardClick={openCard}
                  readOnly={readOnly}
                  canMove={canMove}
                />
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
