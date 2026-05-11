"use client";

import { Plus } from "lucide-react";

import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { Button } from "@/components/ui/button";

interface NewCardButtonProps {
  etapaId: string;
}

export function NewCardButton({ etapaId }: NewCardButtonProps) {
  const openNewCard = useKanbanStore((s) => s.openNewCard);
  return (
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
  );
}
