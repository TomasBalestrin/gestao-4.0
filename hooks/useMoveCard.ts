import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import type { AutomationResult } from "@/types/domain";

export interface MoveCardVariables {
  cardId: string;
  funilId: string;
  etapaId: string;
  ordemNaEtapa?: number;
}

interface MoveCardResponse {
  card: KanbanCardData;
  automationResult: AutomationResult;
}

interface MoveContext {
  previous?: KanbanCardData[];
  funilId: string;
}

export function useMoveCard() {
  const queryClient = useQueryClient();

  return useMutation<
    MoveCardResponse,
    Error,
    MoveCardVariables,
    MoveContext
  >({
    mutationFn: async ({ cardId, etapaId, ordemNaEtapa }) => {
      const res = await fetch(`/api/cards/${cardId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapa_id: etapaId,
          ...(ordemNaEtapa !== undefined
            ? { ordem_na_etapa: ordemNaEtapa }
            : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { data?: MoveCardResponse; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body!.data!;
    },

    onMutate: async ({ cardId, funilId, etapaId }) => {
      const key = cardsKeys.byFunil(funilId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<KanbanCardData[]>(key);
      queryClient.setQueryData<KanbanCardData[]>(key, (old) =>
        (old ?? []).map((c) =>
          c.id === cardId ? { ...c, etapa_id: etapaId } : c
        )
      );
      return { previous, funilId };
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(cardsKeys.byFunil(ctx.funilId), ctx.previous);
      }
      toast.error(`Falha ao mover card: ${err.message}`);
    },

    onSuccess: (data) => {
      if ((data.automationResult?.executions?.length ?? 0) > 0) {
        toast.success("Automação executada");
      }
    },

    onSettled: (_data, _err, vars) => {
      void queryClient.invalidateQueries({
        queryKey: cardsKeys.byFunil(vars.funilId),
      });
    },
  });
}
