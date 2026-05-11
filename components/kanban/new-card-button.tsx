"use client";

import { Plus } from "lucide-react";

import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { Button } from "@/components/ui/button";
import { NewCardModal } from "@/components/kanban/new-card-modal";

interface NewCardButtonProps {
  etapaId: string;
}

export function NewCardButton({ etapaId }: NewCardButtonProps) {
  const newCardEtapaId = useKanbanStore((s) => s.newCardEtapaId);
  const openNewCard = useKanbanStore((s) => s.openNewCard);
  const closeNewCard = useKanbanStore((s) => s.closeNewCard);
  const isOpen = newCardEtapaId === etapaId;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => openNewCard(etapaId)}
      >
        <Plus className="h-4 w-4" />
        Novo card
      </Button>
      {isOpen && <NewCardModal etapaId={etapaId} onClose={closeNewCard} />}
    </>
  );
}
