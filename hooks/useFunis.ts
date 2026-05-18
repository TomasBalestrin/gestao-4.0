import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Funil } from "@/types/domain";

export interface FunilListUser {
  id: string;
  nome: string;
  foto_url: string | null;
}

export type FunilListItem = Funil & {
  etapas_count: number;
  users: FunilListUser[];
};

export const funisKeys = {
  all: ["funis"] as const,
  detail: (id: string) => ["funis", id] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Erro ${res.status}`);
  }
  return body!.data as T;
}

export function useFunis() {
  return useQuery({
    queryKey: funisKeys.all,
    queryFn: () => fetchJson<FunilListItem[]>("/api/funis"),
  });
}

// Liga/desliga o is_archived (toggle não-destrutivo).
export function useToggleFunilArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; archived: boolean }) =>
      fetchJson<Funil>(`/api/funis/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: input.archived }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: funisKeys.all });
    },
  });
}

// Hard delete (cascateia etapas/cards/automações/user_funis).
export function useDeleteFunil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ id: string; deleted: boolean }>(`/api/funis/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: funisKeys.all });
    },
  });
}
