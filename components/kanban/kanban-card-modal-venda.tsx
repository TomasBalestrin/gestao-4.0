"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, Plus } from "lucide-react";

import type { KanbanCardData } from "@/hooks/useCards";
import type { Venda } from "@/types/domain";
import { createVendaSchema } from "@/lib/schemas/venda";
import { ESTADO_CIVIL_LABELS } from "@/lib/constants/estado-civil";
import { formatCurrencyBR, parseCurrencyBR } from "@/lib/utils/formatters";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { Button } from "@/components/ui/button";
import {
  EMPTY_VENDA,
  VendaFormFields,
  type VendaFormState,
} from "@/components/kanban/venda-form-fields";

interface KanbanCardModalVendaProps {
  card: KanbanCardData;
  readOnly: boolean;
}

interface VendaItem extends Venda {
  registered_by_user?: { id: string; nome: string; foto_url: string | null } | null;
  sdr?: { id: string; nome: string; foto_url: string | null } | null;
  funil?: { id: string; nome: string } | null;
}

async function fetchVendas(leadId: string): Promise<VendaItem[]> {
  const res = await fetch(`/api/leads/${leadId}/vendas`);
  const body = (await res.json().catch(() => null)) as
    | { data?: VendaItem[] }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data ?? [];
}

function buildPayload(form: VendaFormState): Record<string, unknown> {
  const valor = parseCurrencyBR(form.valor);
  return {
    produto: form.produto || null,
    valor: valor ?? 0,
    forma_pagamento: form.forma_pagamento || null,
    vigencia: form.vigencia || null,
    data_venda: form.data_venda || null,
    nome_completo: form.nome_completo,
    nacionalidade: form.nacionalidade || null,
    estado_civil: form.estado_civil || null,
    cpf: form.cpf || null,
    rg: form.rg || null,
    cnpj: form.cnpj || null,
    endereco: form.endereco || null,
    bairro: form.bairro || null,
    cidade: form.cidade || null,
    cep: form.cep || null,
    instagram: form.instagram || null,
    email: form.email || null,
    whatsapp: form.whatsapp || null,
    data_nascimento: form.data_nascimento || null,
    funil_id: form.funil_id || null,
    sdr_id: form.sdr_id || null,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export function KanbanCardModalVenda({
  card,
  readOnly,
}: KanbanCardModalVendaProps) {
  const queryClient = useQueryClient();
  const leadId = card.lead.id;

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<VendaFormState>({
    ...EMPTY_VENDA,
    nome_completo: card.lead.nome ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const vendasQuery = useQuery({
    queryKey: ["vendas", leadId],
    queryFn: () => fetchVendas(leadId),
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      payload.card_id = card.id;
      const parsed = createVendaSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      if (!form.funil_id) throw new Error("Selecione um funil");
      if (!form.sdr_id) throw new Error("Selecione um SDR");
      const res = await fetch(`/api/leads/${leadId}/vendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vendas", leadId] });
      notifySuccess("Venda registrada");
      setForm({ ...EMPTY_VENDA, nome_completo: card.lead.nome ?? "" });
      setError(null);
      setCreating(false);
    },
    onError: (err) => setError((err as Error).message),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Vendas deste lead</h2>
          {!readOnly && !creating && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setCreating(true);
                setError(null);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova venda
            </Button>
          )}
        </div>

        {!creating && (
          <>
            {vendasQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
            {!vendasQuery.isLoading &&
              (vendasQuery.data ?? []).length === 0 && (
                <div className="rounded-md border border-dashed p-6 text-center">
                  <CircleDollarSign className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma venda registrada para este lead.
                  </p>
                </div>
              )}
            <div className="space-y-2">
              {(vendasQuery.data ?? []).map((venda) => (
                <div
                  key={venda.id}
                  className="rounded-md border bg-card p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {venda.produto ?? "Produto não informado"}
                      </p>
                      <p className="text-text-secondary">
                        {venda.nome_completo}
                      </p>
                    </div>
                    <p className="text-base font-semibold">
                      {formatCurrencyBR(venda.valor)}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
                    <div>
                      <span className="font-medium text-foreground">Data: </span>
                      {formatDate(venda.data_venda)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Vigência: </span>
                      {venda.vigencia ?? "—"}
                    </div>
                    {venda.estado_civil && (
                      <div>
                        <span className="font-medium text-foreground">
                          Estado civil:{" "}
                        </span>
                        {ESTADO_CIVIL_LABELS[
                          venda.estado_civil as keyof typeof ESTADO_CIVIL_LABELS
                        ] ?? venda.estado_civil}
                      </div>
                    )}
                    {venda.funil && (
                      <div>
                        <span className="font-medium text-foreground">Funil: </span>
                        {venda.funil.nome}
                      </div>
                    )}
                    {venda.sdr && (
                      <div>
                        <span className="font-medium text-foreground">SDR: </span>
                        {venda.sdr.nome}
                      </div>
                    )}
                    {venda.registered_by_user && (
                      <div>
                        <span className="font-medium text-foreground">
                          Registrada por:{" "}
                        </span>
                        {venda.registered_by_user.nome}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {creating && (
          <div className="space-y-4">
            <VendaFormFields
              value={form}
              onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
              disabled={create.isPending}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {creating && !readOnly && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCreating(false);
              setError(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={create.isPending}
            onClick={() => {
              setError(null);
              create.mutate();
            }}
          >
            {create.isPending ? "Registrando..." : "Registrar venda"}
          </Button>
        </div>
      )}
    </div>
  );
}
