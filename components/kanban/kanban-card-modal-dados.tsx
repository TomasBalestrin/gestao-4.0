"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { AutomationErrorBanner } from "@/components/kanban/automation-error-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPTY_LEAD,
  LeadFormFields,
  leadStateToPayload,
  leadToFormState,
  type LeadFormState,
} from "@/components/kanban/lead-form-fields";

interface KanbanCardModalDadosProps {
  card: KanbanCardData;
  readOnly: boolean;
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function KanbanCardModalDados({
  card,
  readOnly,
}: KanbanCardModalDadosProps) {
  const queryClient = useQueryClient();
  const lead = card.lead;

  const [form, setForm] = useState<LeadFormState>(() =>
    lead ? leadToFormState(lead) : EMPTY_LEAD
  );

  useEffect(() => {
    if (lead) setForm(leadToFormState(lead));
  }, [card.id, lead?.id, lead?.updated_at]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = leadStateToPayload(form);
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const saveFollowUp = useMutation({
    mutationFn: async (next: string | null) => {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follow_up_at: next }),
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
      void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      notifySuccess("Follow-up atualizado");
    },
    onError: (err) =>
      notifyError(`Falha no follow-up: ${(err as Error).message}`),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <AutomationErrorBanner cardId={card.id} funilId={card.funil_id} />

        <LeadFormFields
          value={form}
          onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
          disabled={readOnly}
          showNomeAsterisk={false}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="card-follow-up" className="text-xs uppercase tracking-wider text-muted-foreground">
            Follow-up
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="card-follow-up"
              type="date"
              value={card.follow_up_at ?? ""}
              disabled={readOnly || saveFollowUp.isPending}
              onChange={(e) =>
                saveFollowUp.mutate(e.target.value ? e.target.value : null)
              }
              className="max-w-[200px]"
            />
            {card.follow_up_at && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saveFollowUp.isPending}
                onClick={() => saveFollowUp.mutate(null)}
              >
                Limpar
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Aparece na agenda do responsável como tarefa do dia.
          </p>
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
                  {initials(card.assigned.nome)}
                </AvatarFallback>
              </Avatar>
              {card.assigned.nome}
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
}
