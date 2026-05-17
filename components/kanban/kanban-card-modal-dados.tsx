"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { AutomationErrorBanner } from "@/components/kanban/automation-error-banner";
import { AgendarCallModal } from "@/components/agenda/agendar-call-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KanbanCardModalDadosProps {
  card: KanbanCardData;
  readOnly: boolean;
}

interface LeadFormState {
  nome: string;
  email: string;
  telefone: string;
  origem: string;
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

  const [form, setForm] = useState<LeadFormState>({
    nome: lead.nome,
    email: lead.email ?? "",
    telefone: lead.telefone ?? "",
    origem: lead.origem ?? "",
  });

  useEffect(() => {
    setForm({
      nome: lead.nome,
      email: lead.email ?? "",
      telefone: lead.telefone ?? "",
      origem: lead.origem ?? "",
    });
  }, [card.id, lead.nome, lead.email, lead.telefone, lead.origem]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  function patchField(key: keyof LeadFormState, value: string) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <AutomationErrorBanner cardId={card.id} funilId={card.funil_id} />

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
