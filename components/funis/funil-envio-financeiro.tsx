"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import type { Etapa, Funil } from "@/types/domain";
import { funisKeys, type FunilListItem } from "@/hooks/useFunis";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FunilEnvioFinanceiroChange {
  funilFinanceiroId?: string | null;
  etapaEnvioFinanceiroId?: string | null;
}

interface FunilEnvioFinanceiroProps {
  funil: Funil;
  etapasFunil: Etapa[];
  funilFinanceiroId: string | null;
  etapaEnvioFinanceiroId: string | null;
  onChange: (patch: FunilEnvioFinanceiroChange) => void;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

export function FunilEnvioFinanceiro({
  funil,
  etapasFunil,
  funilFinanceiroId,
  etapaEnvioFinanceiroId,
  onChange,
}: FunilEnvioFinanceiroProps) {
  // So faz sentido em funis NAO-financeiros: o financeiro e o destino,
  // nao a origem.
  const elegivel = funil.role_alvo !== "financeiro";

  const funisQuery = useQuery({
    queryKey: funisKeys.all,
    queryFn: () => getJson<FunilListItem[]>("/api/funis"),
    enabled: elegivel,
  });
  const funisFinanceiro = (funisQuery.data ?? []).filter(
    (f) => f.role_alvo === "financeiro" && !f.is_archived
  );

  // Se a etapa selecionada nao existe mais no funil atual, zera.
  useEffect(() => {
    if (!etapaEnvioFinanceiroId) return;
    const exists = etapasFunil.some((e) => e.id === etapaEnvioFinanceiroId);
    if (!exists) onChange({ etapaEnvioFinanceiroId: null });
  }, [etapaEnvioFinanceiroId, etapasFunil, onChange]);

  if (!elegivel) {
    return (
      <p className="text-xs text-muted-foreground">
        Funis com role &quot;financeiro&quot; sao o destino, nao a origem.
        Configure o envio em um funil de closer ou social selling.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-xs text-muted-foreground">
        Quando um card chegar na etapa selecionada, uma copia e criada
        automaticamente no funil financeiro escolhido. O card original
        permanece no funil atual.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Funil financeiro destino</Label>
          <Select
            value={funilFinanceiroId ?? "__none__"}
            onValueChange={(v) =>
              onChange({
                funilFinanceiroId: v === "__none__" ? null : v,
                etapaEnvioFinanceiroId: v === "__none__" ? null : etapaEnvioFinanceiroId,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhum (desativado)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum (desativado)</SelectItem>
              {funisFinanceiro.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Crie um funil com role &quot;financeiro&quot; primeiro.
                </div>
              ) : (
                funisFinanceiro.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Etapa-gatilho (deste funil)</Label>
          <Select
            value={etapaEnvioFinanceiroId ?? undefined}
            onValueChange={(v) => onChange({ etapaEnvioFinanceiroId: v })}
            disabled={!funilFinanceiroId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !funilFinanceiroId
                    ? "Escolha o funil financeiro primeiro"
                    : "Escolha uma etapa"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {etapasFunil.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
