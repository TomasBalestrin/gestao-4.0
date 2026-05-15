"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Etapa, Funil } from "@/types/domain";
import { funisKeys, type FunilListItem } from "@/hooks/useFunis";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface FunilAgendamentoProps {
  funil: Funil;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

interface FunilWithEtapas extends Funil {
  etapas: Etapa[];
}

export function FunilAgendamento({ funil }: FunilAgendamentoProps) {
  const queryClient = useQueryClient();
  const elegivel =
    funil.role_alvo === "sdr" || funil.role_alvo === "social_selling";

  const [enabled, setEnabled] = useState(funil.agenda_call_enabled ?? false);
  const [funilDestinoId, setFunilDestinoId] = useState<string | null>(
    funil.funil_destino_id ?? null
  );
  const [etapaDestinoId, setEtapaDestinoId] = useState<string | null>(
    funil.etapa_destino_id ?? null
  );

  const funisQuery = useQuery({
    queryKey: funisKeys.all,
    queryFn: () => getJson<FunilListItem[]>("/api/funis"),
    enabled: elegivel,
  });
  const closerFunis = (funisQuery.data ?? []).filter(
    (f) => f.role_alvo === "closer" && !f.is_archived && f.id !== funil.id
  );

  const destinoDetailQuery = useQuery({
    queryKey: ["funil-detail", funilDestinoId],
    queryFn: () => getJson<FunilWithEtapas>(`/api/funis/${funilDestinoId}`),
    enabled: elegivel && !!funilDestinoId,
  });
  const etapasDestino = destinoDetailQuery.data?.etapas ?? [];

  // Se a etapa selecionada não existe no funil destino atual, zera para evitar
  // enviar um id órfão no PATCH.
  useEffect(() => {
    if (!funilDestinoId) return;
    if (!etapaDestinoId) return;
    if (destinoDetailQuery.isLoading) return;
    const exists = etapasDestino.some((e) => e.id === etapaDestinoId);
    if (!exists) setEtapaDestinoId(null);
  }, [funilDestinoId, etapaDestinoId, etapasDestino, destinoDetailQuery.isLoading]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        agenda_call_enabled: enabled,
        funil_destino_id: enabled ? funilDestinoId : null,
        etapa_destino_id: enabled ? etapaDestinoId : null,
      };
      const res = await fetch(`/api/funis/${funil.id}`, {
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
      void queryClient.invalidateQueries({ queryKey: funisKeys.all });
      void queryClient.invalidateQueries({
        queryKey: ["funil-detail", funil.id],
      });
      notifySuccess("Agendamento atualizado");
    },
    onError: (err) =>
      notifyError(`Falha ao salvar: ${(err as Error).message}`),
  });

  if (!elegivel) {
    return (
      <p className="text-xs text-muted-foreground">
        Apenas funis de SDR ou Social Selling podem habilitar agendamento de
        call. Funis de Closer são o destino do agendamento.
      </p>
    );
  }

  const podeSalvar =
    !save.isPending &&
    (!enabled || (!!funilDestinoId && !!etapaDestinoId));

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-xs text-muted-foreground">
        Quando habilitado, o card recebe o botão &quot;Agendar call&quot; e, ao
        agendar, é movido automaticamente para o funil/etapa do closer
        escolhido — passando a ficar visível apenas para o closer agendado.
      </p>

      <label className="flex items-center gap-3 rounded-md border bg-card p-3">
        <Switch
          checked={enabled}
          onCheckedChange={(v) => setEnabled(Boolean(v))}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Permitir agendamento de call neste funil
          </p>
          <p className="text-xs text-muted-foreground">
            Sem isso, o botão &quot;Agendar call&quot; fica oculto nos cards
            deste funil.
          </p>
        </div>
      </label>

      {enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Funil de destino</Label>
            <Select
              value={funilDestinoId ?? undefined}
              onValueChange={(v) => {
                setFunilDestinoId(v);
                setEtapaDestinoId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um funil de closer" />
              </SelectTrigger>
              <SelectContent>
                {closerFunis.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Nenhum funil de closer disponível.
                  </div>
                ) : (
                  closerFunis.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Etapa de destino</Label>
            <Select
              value={etapaDestinoId ?? undefined}
              onValueChange={(v) => setEtapaDestinoId(v)}
              disabled={!funilDestinoId || destinoDetailQuery.isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !funilDestinoId
                      ? "Escolha o funil primeiro"
                      : destinoDetailQuery.isLoading
                        ? "Carregando..."
                        : "Escolha uma etapa"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {etapasDestino.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        disabled={!podeSalvar}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "Salvando..." : "Salvar agendamento"}
      </Button>
    </div>
  );
}
