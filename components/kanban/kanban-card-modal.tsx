"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { isCloser } from "@/lib/utils/permissions";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { notifyError, notifySuccess } from "@/lib/utils/notify";

const AgendarCallModal = dynamic(
  () =>
    import("@/components/agenda/agendar-call-modal").then((m) => ({
      default: m.AgendarCallModal,
    })),
  { ssr: false }
);
import {
  KanbanCardModalSidebar,
  type CardModalPane,
} from "@/components/kanban/kanban-card-modal-sidebar";
import { KanbanCardModalDados } from "@/components/kanban/kanban-card-modal-dados";
import { KanbanCardModalChat } from "@/components/kanban/kanban-card-modal-chat";
import { KanbanCardModalHistorico } from "@/components/kanban/kanban-card-modal-historico";
import { KanbanCardModalVenda } from "@/components/kanban/kanban-card-modal-venda";
import { InstagramPane } from "@/components/chat/instagram-pane";
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

async function fetchFunilFlag(
  funilId: string
): Promise<{ agenda_call_enabled: boolean }> {
  const res = await fetch(`/api/funis/${funilId}`);
  const body = (await res.json().catch(() => null)) as
    | { data?: { agenda_call_enabled: boolean } }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data ?? { agenda_call_enabled: false };
}

export function KanbanCardModal({ card }: KanbanCardModalProps) {
  const { role } = useCurrentUser();
  const selectedCardId = useKanbanStore((s) => s.selectedCardId);
  const selectedPane = useKanbanStore((s) => s.selectedPane);
  const closeCard = useKanbanStore((s) => s.closeCard);
  const queryClient = useQueryClient();
  const open = selectedCardId === card.id;

  const funilMeQuery = useQuery({
    queryKey: ["funil-me", card.funil_id],
    queryFn: async (): Promise<{ is_spectator: boolean }> => {
      const res = await fetch(`/api/funis/${card.funil_id}/me`);
      const body = (await res.json().catch(() => null)) as
        | { data?: { is_spectator: boolean } }
        | null;
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      return body?.data ?? { is_spectator: false };
    },
    staleTime: 60_000,
    enabled: open,
  });
  const isSpectator = funilMeQuery.data?.is_spectator === true;
  const readOnly = isCloser(role) || isSpectator;
  const canRegisterVenda =
    !isSpectator && (role === "admin" || role === "closer");

  const [pane, setPane] = useState<CardModalPane>("dados");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const funilFlag = useQuery({
    queryKey: ["funil-detail", card.funil_id],
    queryFn: () => fetchFunilFlag(card.funil_id),
    enabled: open,
    staleTime: 60_000,
  });
  const podeAgendarCall = funilFlag.data?.agenda_call_enabled === true;

  useEffect(() => {
    if (open) setPane(selectedPane ?? "dados");
  }, [open, card.id, selectedPane]);

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
          <DialogHeader className="shrink-0 gap-2 border-b px-6 py-4 pr-12">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="truncate text-base">
                  {card.lead.nome}
                </DialogTitle>
                <DialogDescription>
                  {card.etapa ? card.etapa.nome : "Card"}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!readOnly && podeAgendarCall && (
                  <AgendarCallModal cardId={card.id} />
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <KanbanCardModalSidebar
              active={pane}
              onSelect={setPane}
              onDelete={() => setConfirmDelete(true)}
              canDelete={!readOnly}
              canVenda={canRegisterVenda}
            />

            <div className="min-w-0 flex-1">
              {pane === "dados" && (
                <KanbanCardModalDados card={card} readOnly={readOnly} />
              )}
              {pane === "venda" && canRegisterVenda && (
                <KanbanCardModalVenda card={card} readOnly={readOnly} />
              )}
              {pane === "chat" && (
                <KanbanCardModalChat
                  leadId={card.lead.id}
                  active={open && pane === "chat"}
                />
              )}
              {pane === "instagram" && (
                <InstagramPane
                  leadId={card.lead.id}
                  leadNome={card.lead.nome}
                  active={open && pane === "instagram"}
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
