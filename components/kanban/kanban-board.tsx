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
import { Plus, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { Etapa } from "@/types/domain";
import { cn } from "@/lib/utils/cn";
import { useCards } from "@/hooks/useCards";
import { useMoveCard } from "@/hooks/useMoveCard";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { isCloser } from "@/lib/utils/permissions";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { KanbanSkeleton } from "@/components/shared/loading-spinner";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanCardModal } from "@/components/kanban/kanban-card-modal";
import { NewCardModal } from "@/components/kanban/new-card-modal";
import { Button } from "@/components/ui/button";
import type { KanbanCardData } from "@/hooks/useCards";

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
  const meQuery = useQuery({
    queryKey: ["funil-me", funilId],
    queryFn: async (): Promise<{ is_spectator: boolean }> => {
      const res = await fetch(`/api/funis/${funilId}/me`);
      const body = (await res.json().catch(() => null)) as
        | { data?: { is_spectator: boolean } }
        | null;
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      return body?.data ?? { is_spectator: false };
    },
    staleTime: 60_000,
  });
  const isSpectator = meQuery.data?.is_spectator === true;
  const readOnly = isCloser(role) || isSpectator;
  const { data: cards, isLoading, isError, error } = useCards(funilId);
  const openCard = useKanbanStore((s) => s.openCard);
  const selectedCardId = useKanbanStore((s) => s.selectedCardId);
  const newLeadOpen = useKanbanStore((s) => s.newLeadOpen);
  const openNewLead = useKanbanStore((s) => s.openNewLead);
  const closeNewLead = useKanbanStore((s) => s.closeNewLead);
  const moveCard = useMoveCard();

  const activeCard: KanbanCardData | null = useMemo(() => {
    if (!selectedCardId || !cards) return null;
    return cards.find((c) => c.id === selectedCardId) ?? null;
  }, [selectedCardId, cards]);

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
    if (readOnly) return;
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
      {isSpectator && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <Eye className="size-4 shrink-0" />
          Modo espectador: você vê todos os cards mas não pode mover nem editar.
        </div>
      )}
      {!readOnly && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            onClick={openNewLead}
            aria-label="Novo lead"
          >
            <Plus className="h-4 w-4" />
            Novo lead
          </Button>
        </div>
      )}

      {showEmptyHint && (
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? "Nenhum card neste funil ainda."
            : "Nenhum card neste funil. Clique em “Novo lead” para começar."}
        </p>
      )}

      {newLeadOpen && (
        <NewCardModal etapaId={null} onClose={closeNewLead} />
      )}

      {activeCard && <KanbanCardModal card={activeCard} />}

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
                />
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
