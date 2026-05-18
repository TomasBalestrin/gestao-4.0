import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AgendarCallVariables {
  card_id: string;
  closer_id: string;
  slot_start: string;
  slot_end: string;
  notes?: string | null;
}

interface HttpError extends Error {
  status?: number;
}

export function useAgendarCall(onScheduled?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<unknown, HttpError, AgendarCallVariables>({
    mutationFn: async (vars) => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const body = (await res.json().catch(() => null)) as
        | { data?: unknown; error?: string }
        | null;
      if (!res.ok) {
        const err: HttpError = new Error(body?.error ?? `Erro ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return body?.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["slots"] });
      void queryClient.invalidateQueries({ queryKey: ["calls"] });
      // O backend pode mover o card para o funil destino do closer.
      // Invalida todas as listas de cards para refletir a migração.
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Call agendada");
      onScheduled?.();
    },
    onError: (err) => {
      // Conflito de slot: recarrega os horários e mantém o modal aberto.
      void queryClient.invalidateQueries({ queryKey: ["slots"] });
      if (err.status === 409) {
        toast.warning("Este horário acabou de ser reservado. Atualizando...");
      } else {
        toast.error(`Falha ao agendar: ${err.message}`);
      }
    },
  });
}
