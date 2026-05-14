"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useFunis } from "@/hooks/useFunis";
import type { ConfiguracaoGlobal } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

export function ConfigForm() {
  const queryClient = useQueryClient();
  const { data: configs } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: () => getJson<ConfiguracaoGlobal[]>("/api/configuracoes"),
  });
  const { data: funis } = useFunis();

  const [inboundFunil, setInboundFunil] = useState<string>(NONE);
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    if (!configs) return;
    const map = new Map(configs.map((c) => [c.key, c.value]));
    const inbound = map.get("inbound_default_funil_id");
    setInboundFunil(typeof inbound === "string" && inbound ? inbound : NONE);
    const t = map.get("default_theme");
    setTheme(typeof t === "string" ? t : "dark");
  }, [configs]);

  const save = useMutation({
    mutationFn: async () => {
      await Promise.all([
        fetch("/api/configuracoes/inbound_default_funil_id", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: inboundFunil === NONE ? null : inboundFunil,
          }),
        }).then(async (r) => {
          if (!r.ok) {
            const b = (await r.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(b?.error ?? `Erro ${r.status}`);
          }
        }),
        fetch("/api/configuracoes/default_theme", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: theme }),
        }).then(async (r) => {
          if (!r.ok) throw new Error(`Erro ${r.status}`);
        }),
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
      toast.success("Configurações salvas");
    },
    onError: (err) => toast.error(`Falha ao salvar: ${(err as Error).message}`),
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="inbound">Funil de inbound padrão</Label>
        <Select value={inboundFunil} onValueChange={setInboundFunil}>
          <SelectTrigger id="inbound">
            <SelectValue placeholder="Selecione um funil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Nenhum</SelectItem>
            {(funis ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Leads recebidos por integrações entram neste funil.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme">Tema padrão da plataforma</Label>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger id="theme" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Escuro</SelectItem>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
