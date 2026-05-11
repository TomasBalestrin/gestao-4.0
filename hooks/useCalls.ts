import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type CallStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface CallWithCtx {
  id: string;
  card_id: string;
  closer_id: string;
  scheduled_by: string;
  slot_start: string;
  slot_end: string;
  status: CallStatus;
  notes: string | null;
  card: {
    id: string;
    funil_id: string;
    lead: { id: string; nome: string; telefone: string | null } | null;
  } | null;
  closer: { id: string; nome: string; foto_url: string | null } | null;
  scheduler: { id: string; nome: string } | null;
}

export const callsKeys = { all: ["calls"] as const };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

export function useCalls() {
  return useQuery({
    queryKey: callsKeys.all,
    queryFn: () => getJson<CallWithCtx[]>("/api/calls"),
  });
}

export function useCancelCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calls/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: callsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Call cancelada");
    },
    onError: (err) => toast.error((err as Error).message),
  });
}

export function useCallAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "completed" | "no_show";
    }) => {
      const res = await fetch(`/api/calls/${id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: callsKeys.all });
      toast.success("Presença registrada");
    },
    onError: (err) => toast.error((err as Error).message),
  });
}
