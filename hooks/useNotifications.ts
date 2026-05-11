import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Notification } from "@/types/domain";

export const notificationsKeys = { all: ["notifications"] as const };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKeys.all,
    queryFn: () => getJson<Notification[]>("/api/notifications"),
    staleTime: 15_000,
  });
}

export function unreadCount(items: Notification[] | undefined): number {
  return (items ?? []).filter((n) => n.read_at === null).length;
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids?: string[]; all?: boolean }) => {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}
