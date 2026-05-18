"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { AutomationErrorBanner } from "@/components/kanban/automation-error-banner";
import { AgendarCallModal } from "@/components/agenda/agendar-call-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

export function KanbanCardModalDados({
  card,
  readOnly,
}: KanbanCardModalDadosProps) {
  const queryClient = useQueryClient();
  const lead = card.lead;

  const funilQuery = useQuery({
    queryKey: ["funil-detail", card.funil_id],
    queryFn: () =>
      getJson<{ agenda_call_enabled: boolean }>(
        `/api/funis/${card.funil_id}`
      ),
  });
  const podeAgendarCall = funilQuery.data?.agenda_call_enabled === true;

  const [form, setForm] = useState<LeadFormState>(() =>
    lead ? leadToFormState(lead) : EMPTY_LEAD
  );

  useEffect(() => {
    if (lead) setForm(leadToFormState(lead));
  }, [
    card.id,
    lead?.nome,
    lead?.telefone,
    lead?.email,
    lead?.instagram,
    lead?.empresa,
    lead?.nicho,
    lead?.faturamento_mensal,
    lead?.tem_socio,
    lead?.funil_origem,
    lead?.sdr_id,
    lead?.produto_ofertado,
    lead?.dor_principal,
    lead?.observacoes,
    lead?.data_followup,
  ]);

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

      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-3">
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
    </div>
  );
}
