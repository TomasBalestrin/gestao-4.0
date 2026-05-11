"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Automacao } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const automacoesKeys = {
  byEtapa: (etapaId: string) => ["automacoes", etapaId] as const,
};

const ACTION_LABELS: Record<Automacao["action"], string> = {
  move_to: "Mover para",
  duplicate_to: "Duplicar para",
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

interface AutomacaoListProps {
  etapaId: string;
}

export function AutomacaoList({ etapaId }: AutomacaoListProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: automacoesKeys.byEtapa(etapaId),
    queryFn: () => getJson<Automacao[]>(`/api/etapas/${etapaId}/automacoes`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automacoes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automacoesKeys.byEtapa(etapaId),
      });
      toast.success("Automação removida");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">Falha ao carregar automações.</p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma automação nesta etapa.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((a) => {
        const notifCount = Array.isArray(a.notificacoes)
          ? a.notificacoes.length
          : 0;
        return (
          <li
            key={a.id}
            className="flex items-center justify-between gap-2 rounded-md border bg-card p-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{a.nome}</span>
                <Badge variant="outline">{ACTION_LABELS[a.action]}</Badge>
                {!a.ativo && <Badge variant="secondary">Inativa</Badge>}
              </div>
              {notifCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {notifCount} notificação{notifCount > 1 ? "ões" : ""}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remover automação"
              disabled={remove.isPending}
              onClick={() => remove.mutate(a.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
