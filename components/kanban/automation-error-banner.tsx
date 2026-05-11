"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { cardsKeys } from "@/hooks/useCards";
import type { AutomationError } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { notifyError, notifySuccess } from "@/lib/utils/notify";

export const automationErrorsKeys = {
  byCard: (cardId: string) => ["automation-errors", cardId] as const,
};

interface AutomationErrorBannerProps {
  cardId: string;
  funilId?: string;
}

export function AutomationErrorBanner({
  cardId,
  funilId,
}: AutomationErrorBannerProps) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: automationErrorsKeys.byCard(cardId),
    queryFn: async () => {
      const res = await fetch(
        `/api/automation-errors?card_id=${encodeURIComponent(cardId)}`
      );
      const body = (await res.json().catch(() => null)) as
        | { data?: AutomationError[] }
        | null;
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      return body?.data ?? [];
    },
  });

  const retry = useMutation({
    mutationFn: async (errorId: string) => {
      const res = await fetch(`/api/automation-errors/${errorId}/retry`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automationErrorsKeys.byCard(cardId),
      });
      if (funilId) {
        void queryClient.invalidateQueries({
          queryKey: cardsKeys.byFunil(funilId),
        });
      }
      notifySuccess("Automação reexecutada");
    },
    onError: (err) => notifyError(`Retry falhou: ${(err as Error).message}`),
  });

  const errors = data ?? [];
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        Automação falhou
      </div>
      {errors.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 break-words text-xs text-destructive/90">
            {e.error_message}
          </p>
          <ConfirmDialog
            title="Reexecutar automação?"
            description="A automação será executada novamente para este card."
            confirmLabel="Reexecutar"
            onConfirm={() => retry.mutate(e.id)}
            trigger={
              <Button size="sm" variant="outline" disabled={retry.isPending}>
                Retry
              </Button>
            }
          />
        </div>
      ))}
    </div>
  );
}
