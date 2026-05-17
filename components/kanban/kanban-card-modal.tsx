"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { isCloser } from "@/lib/utils/permissions";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import {
  KanbanCardModalSidebar,
  type CardModalPane,
} from "@/components/kanban/kanban-card-modal-sidebar";
import { KanbanCardModalDados } from "@/components/kanban/kanban-card-modal-dados";
import { KanbanCardModalChat } from "@/components/kanban/kanban-card-modal-chat";
import { KanbanCardModalHistorico } from "@/components/kanban/kanban-card-modal-historico";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KanbanCardModalProps {
  card: KanbanCardData;
}

export function KanbanCardModal({ card }: KanbanCardModalProps) {
  const { role } = useCurrentUser();
  const readOnly = isCloser(role);
  const selectedCardId = useKanbanStore((s) => s.selectedCardId);
  const closeCard = useKanbanStore((s) => s.closeCard);
  const queryClient = useQueryClient();
  const open = selectedCardId === card.id;

  const [pane, setPane] = useState<CardModalPane>("dados");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) setPane("dados");
  }, [open, card.id]);

  const del = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cardsKeys.byFunil(card.funil_id),
      });
      notifySuccess("Card removido");
      closeCard();
    },
    onError: (err) => notifyError(`Falha ao remover: ${(err as Error).message}`),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && closeCard()}>
        <DialogContent className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle className="truncate text-base">
              {card.lead.nome}
            </DialogTitle>
            <DialogDescription>
              {card.etapa ? card.etapa.nome : "Card"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <KanbanCardModalSidebar
              active={pane}
              onSelect={setPane}
              onDelete={() => setConfirmDelete(true)}
              canDelete={!readOnly}
            />

            <div className="min-w-0 flex-1">
              {pane === "dados" && (
                <KanbanCardModalDados card={card} readOnly={readOnly} />
              )}
              {pane === "chat" && (
                <KanbanCardModalChat
                  leadId={card.lead.id}
                  active={open && pane === "chat"}
                />
              )}
              {pane === "historico" && (
                <KanbanCardModalHistorico cardId={card.id} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este card?</AlertDialogTitle>
            <AlertDialogDescription>
              O card é removido do funil (soft delete). O lead é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => del.mutate()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
