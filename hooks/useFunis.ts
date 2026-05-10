import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Funil } from "@/types/domain";

export type FunilListItem = Funil & { etapas_count: number };

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

export function useArchiveFunil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ id: string; archived: boolean }>(`/api/funis/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: funisKeys.all });
    },
  });
}
