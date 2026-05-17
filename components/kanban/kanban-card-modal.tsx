"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Trash2 } from "lucide-react";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { isCloser } from "@/lib/utils/permissions";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { AutomationErrorBanner } from "@/components/kanban/automation-error-banner";
import { AgendarCallModal } from "@/components/agenda/agendar-call-modal";
import { CardHistoryTimeline } from "@/components/audit/card-history-timeline";
import { ChatTriggerIcon } from "@/components/chat/chat-trigger-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface LeadFormState {
  nome: string;
  email: string;
  telefone: string;
  origem: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

function leadInitials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function KanbanCardModal({ card }: KanbanCardModalProps) {
  const { role } = useCurrentUser();
  const readOnly = isCloser(role);
  const selectedCardId = useKanbanStore((s) => s.selectedCardId);
  const closeCard = useKanbanStore((s) => s.closeCard);
  const queryClient = useQueryClient();
  const open = selectedCardId === card.id;

  const lead = card.lead;

  const funilQuery = useQuery({
    queryKey: ["funil-detail", card.funil_id],
    queryFn: () =>
      getJson<{ agenda_call_enabled: boolean }>(
        `/api/funis/${card.funil_id}`
      ),
    enabled: open,
  });
  const podeAgendarCall = funilQuery.data?.agenda_call_enabled === true;

  const [form, setForm] = useState<LeadFormState>({
    nome: lead.nome,
    email: lead.email ?? "",
    telefone: lead.telefone ?? "",
    origem: lead.origem ?? "",
  });
  const [historyOpen, setHistoryOpen] = useState(false);

  // Reidrata o form quando o modal abre ou o card muda.
  useEffect(() => {
    if (!open) return;
    setForm({
      nome: lead.nome,
      email: lead.email ?? "",
      telefone: lead.telefone ?? "",
      origem: lead.origem ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card.id]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          telefone: form.telefone,
          origem: form.origem,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cardsKeys.byFunil(card.funil_id),
      });
      notifySuccess("Lead atualizado");
    },
    onError: (err) => notifyError(`Falha ao salvar: ${(err as Error).message}`),
  });

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

  function patchField(key: keyof LeadFormState, value: string) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && closeCard()}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 pr-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate">{lead.nome}</DialogTitle>
                <DialogDescription>
                  {card.etapa ? card.etapa.nome : "Card"}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Ver histórico"
                  title="Histórico"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-4 w-4" />
                </Button>
                <ChatTriggerIcon
                  leadId={lead.id}
                  hasPhone={!!lead.telefone}
                  variant="header"
                />
                {!readOnly && (
                  <ConfirmDialog
                    title="Excluir este card?"
                    description="O card é removido do funil (soft delete). O lead é mantido."
                    confirmLabel="Excluir"
                    destructive
                    onConfirm={() => del.mutate()}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={del.isPending}
                        aria-label="Excluir card"
                        title="Excluir card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <AutomationErrorBanner
              cardId={card.id}
              funilId={card.funil_id}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lead-nome">Nome</Label>
                <Input
                  id="lead-nome"
                  value={form.nome}
                  disabled={readOnly}
                  onChange={(e) => patchField("nome", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-telefone">Telefone</Label>
                <Input
                  id="lead-telefone"
                  value={form.telefone}
                  disabled={readOnly}
                  onChange={(e) => patchField("telefone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={form.email}
                  disabled={readOnly}
                  onChange={(e) => patchField("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lead-origem">Origem</Label>
                <Input
                  id="lead-origem"
                  value={form.origem}
                  disabled={readOnly}
                  onChange={(e) => patchField("origem", e.target.value)}
                />
              </div>
            </div>

            {card.assigned && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Responsável
                </Label>
                <div className="inline-flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    {card.assigned.foto_url && (
                      <AvatarImage
                        src={card.assigned.foto_url}
                        alt={card.assigned.nome}
                      />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {leadInitials(card.assigned.nome)}
                    </AvatarFallback>
                  </Avatar>
                  {card.assigned.nome}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t pt-4">
            {!readOnly && podeAgendarCall ? (
              <AgendarCallModal cardId={card.id} />
            ) : (
              <div />
            )}
            {!readOnly && (
              <Button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Histórico</DialogTitle>
            <DialogDescription>Eventos registrados deste card.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <CardHistoryTimeline cardId={card.id} enabled={historyOpen} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
