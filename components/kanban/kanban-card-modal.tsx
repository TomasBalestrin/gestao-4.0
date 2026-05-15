"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2, X } from "lucide-react";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { useCardCalls, useCancelCall } from "@/hooks/useCalls";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import { isCloser } from "@/lib/utils/permissions";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatCallDateTime,
} from "@/lib/utils/format-call";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import {
  CustomFieldInput,
  parseCustomFieldsConfig,
} from "@/components/forms/custom-field-input";
import { AutomationErrorBanner } from "@/components/kanban/automation-error-banner";
import { AgendarCallModal } from "@/components/agenda/agendar-call-modal";
import { CardHistoryTimeline } from "@/components/audit/card-history-timeline";
import { ChatTriggerIcon } from "@/components/chat/chat-trigger-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface KanbanCardModalProps {
  card: KanbanCardData;
}

interface ExtraField {
  key: string;
  nome: string;
  valor: string;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 9);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

export function KanbanCardModal({ card }: KanbanCardModalProps) {
  const { role } = useCurrentUser();
  const readOnly = isCloser(role);
  const selectedCardId = useKanbanStore((s) => s.selectedCardId);
  const closeCard = useKanbanStore((s) => s.closeCard);
  const queryClient = useQueryClient();
  const open = selectedCardId === card.id;

  const funilQuery = useQuery({
    queryKey: ["funil-detail", card.funil_id],
    queryFn: () =>
      getJson<{ custom_fields_schema: unknown }>(
        `/api/funis/${card.funil_id}`
      ),
    enabled: open,
  });
  const cfConfig = parseCustomFieldsConfig(funilQuery.data?.custom_fields_schema);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [extras, setExtras] = useState<ExtraField[]>([]);

  // Reidrata o split (campos do funil vs. ad-hoc) quando o modal abre ou a
  // config de campos do funil chega.
  useEffect(() => {
    if (!open) return;
    const cf = (card.custom_fields as Record<string, unknown>) ?? {};
    const knownIds = new Set(cfConfig.map((f) => f.id));
    const nextValues: Record<string, unknown> = {};
    const nextExtras: ExtraField[] = [];
    for (const [k, v] of Object.entries(cf)) {
      if (knownIds.has(k)) {
        nextValues[k] = v;
      } else {
        nextExtras.push({
          key: makeKey(),
          nome: k,
          valor: v == null ? "" : String(v),
        });
      }
    }
    setValues(nextValues);
    setExtras(nextExtras);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card.id, funilQuery.data]);

  function buildPayload(): Record<string, unknown> {
    const out: Record<string, unknown> = { ...values };
    for (const e of extras) {
      const nome = e.nome.trim();
      if (nome) out[nome] = e.valor;
    }
    return out;
  }

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_fields: buildPayload() }),
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
      notifySuccess("Card atualizado");
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

  function addExtra() {
    setExtras((s) => [...s, { key: makeKey(), nome: "", valor: "" }]);
  }
  function patchExtra(i: number, patch: Partial<ExtraField>) {
    setExtras((s) => s.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function removeExtra(i: number) {
    setExtras((s) => s.filter((_, idx) => idx !== i));
  }

  const lead = card.lead;
  const hasAnyField = cfConfig.length > 0 || extras.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeCard()}>
      <DialogContent className="flex h-[85vh] max-h-[720px] flex-col gap-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle>{lead.nome}</DialogTitle>
              <DialogDescription>
                {card.etapa ? card.etapa.nome : "Card"}
              </DialogDescription>
            </div>
            <ChatTriggerIcon
              leadId={lead.id}
              hasPhone={!!lead.telefone}
              variant="header"
            />
          </div>
        </DialogHeader>

        <Tabs
          defaultValue="detalhes"
          className="mt-4 flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="detalhes" className="flex-1">
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex-1">
              Calls
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex-1">
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="detalhes"
            className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1"
          >
            <AutomationErrorBanner
              cardId={card.id}
              funilId={card.funil_id}
            />
            <div className="space-y-1 rounded-md border bg-card p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Lead: </span>
                {lead.nome}
              </p>
              {lead.email && (
                <p>
                  <span className="text-muted-foreground">Email: </span>
                  {lead.email}
                </p>
              )}
              {lead.telefone && (
                <p>
                  <span className="text-muted-foreground">Telefone: </span>
                  {lead.telefone}
                </p>
              )}
              {lead.origem && (
                <p>
                  <span className="text-muted-foreground">Origem: </span>
                  {lead.origem}
                </p>
              )}
              {card.assigned && (
                <p>
                  <span className="text-muted-foreground">Responsável: </span>
                  {card.assigned.nome}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Campos
                </p>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={addExtra}
                    aria-label="Adicionar campo"
                    title="Adicionar campo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {cfConfig.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-xs">
                    {field.nome}
                    {field.obrigatorio && " *"}
                  </Label>
                  <CustomFieldInput
                    field={field}
                    value={values[field.id]}
                    onChange={(v) =>
                      setValues((s) => ({ ...s, [field.id]: v }))
                    }
                    disabled={readOnly}
                  />
                </div>
              ))}

              {extras.map((e, i) => (
                <div
                  key={e.key}
                  className="flex items-end gap-2 rounded-md border bg-card p-2"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={e.nome}
                      placeholder="Ex: Cidade"
                      disabled={readOnly}
                      onChange={(ev) => patchExtra(i, { nome: ev.target.value })}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      value={e.valor}
                      disabled={readOnly}
                      onChange={(ev) => patchExtra(i, { valor: ev.target.value })}
                    />
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExtra(i)}
                      aria-label="Remover campo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {!hasAnyField && (
                <p className="text-xs text-muted-foreground">
                  {readOnly
                    ? "Sem campos preenchidos."
                    : "Sem campos. Use o + para adicionar."}
                </p>
              )}

              {hasAnyField && !readOnly && (
                <Button
                  type="button"
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? "Salvando..." : "Salvar campos"}
                </Button>
              )}
            </div>

            {!readOnly && (
              <div className="border-t pt-3">
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
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={del.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir card
                    </Button>
                  }
                />
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="calls"
            className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1"
          >
            {!readOnly && <AgendarCallModal cardId={card.id} />}
            <CardCallsList
              cardId={card.id}
              enabled={open}
              readOnly={readOnly}
            />
          </TabsContent>

          <TabsContent
            value="historico"
            className="mt-4 flex-1 overflow-y-auto pr-1"
          >
            <CardHistoryTimeline cardId={card.id} enabled={open} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CardCallsList({
  cardId,
  enabled,
  readOnly,
}: {
  cardId: string;
  enabled: boolean;
  readOnly?: boolean;
}) {
  const { data, isLoading } = useCardCalls(cardId, enabled);
  const cancel = useCancelCall();

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Carregando...</p>;
  }
  const calls = data ?? [];
  if (calls.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma call agendada para este card.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {calls.map((call) => (
        <li
          key={call.id}
          className="flex items-start gap-3 rounded-md border bg-card p-3"
        >
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {formatCallDateTime(call.slot_start, call.slot_end)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_TONE[call.status]}`}
              >
                {STATUS_LABEL[call.status]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Closer: {call.closer?.nome ?? "—"}
            </p>
            {call.notes && (
              <p className="text-xs text-muted-foreground">{call.notes}</p>
            )}
          </div>
          {call.status === "scheduled" && !readOnly && (
            <ConfirmDialog
              title="Cancelar esta call?"
              description="O horário voltará a ficar disponível na agenda do closer."
              confirmLabel="Cancelar call"
              destructive
              onConfirm={() => cancel.mutate(call.id)}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={cancel.isPending}
                  aria-label="Cancelar call"
                >
                  <X className="h-4 w-4" />
                </Button>
              }
            />
          )}
        </li>
      ))}
    </ul>
  );
}
