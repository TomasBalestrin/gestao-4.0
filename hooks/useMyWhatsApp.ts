import { useQuery } from "@tanstack/react-query";

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

export function useMyWhatsApp() {
  return useQuery({
    queryKey: myWhatsAppKeys.status,
    queryFn: fetchMyStatus,
    // Quem dispara o "connected" é o webhook do NextTrack após o admin parear
    // na NextTrack. Poll leve enquanto está pending/qr_pending pra atualizar.
    refetchInterval: (query) => {
      const status = query.state.data?.instance?.status;
      if (status === "pending" || status === "qr_pending") return 5000;
      return false;
    },
    staleTime: 2000,
  });
}
