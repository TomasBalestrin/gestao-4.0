import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { WaInstance } from "@/types/domain";

export const myWhatsAppKeys = {
  status: ["me", "whatsapp"] as const,
};

interface StatusResponse {
  instance: WaInstance | null;
}

async function fetchMyStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/me/whatsapp");
  const body = (await res.json().catch(() => null)) as
    | { data?: StatusResponse; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data ?? { instance: null };
}

async function refreshQr(): Promise<StatusResponse> {
  const res = await fetch("/api/me/whatsapp/qr", { method: "GET" });
  const body = (await res.json().catch(() => null)) as
    | { data?: StatusResponse; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data ?? { instance: null };
}

export function useMyWhatsApp() {
  return useQuery({
    queryKey: myWhatsAppKeys.status,
    queryFn: fetchMyStatus,
    refetchInterval: (query) => {
      const status = query.state.data?.instance?.status;
      if (status === "qr_pending" || status === "pending") return 3000;
      return false;
    },
    staleTime: 1000,
  });
}

export function useRefreshWhatsAppQr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: refreshQr,
    onSuccess: (data) => qc.setQueryData(myWhatsAppKeys.status, data),
  });
}

export function useConnectWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me/whatsapp/connect", { method: "POST" });
      const body = (await res.json().catch(() => null)) as
        | { data?: StatusResponse; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body?.data ?? { instance: null };
    },
    onSuccess: (data) => qc.setQueryData(myWhatsAppKeys.status, data),
  });
}

export function useDisconnectWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me/whatsapp/disconnect", { method: "POST" });
      const body = (await res.json().catch(() => null)) as
        | { data?: { ok: true }; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body?.data;
    },
    onSuccess: () => {
      qc.setQueryData(myWhatsAppKeys.status, { instance: null });
    },
  });
}
