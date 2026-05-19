"use client";

import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FollowUpRow } from "@/components/agenda/follow-up-item";

interface FollowUpDetailModalProps {
  item: FollowUpRow | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function FollowUpDetailModal({
  item,
  onClose,
}: FollowUpDetailModalProps) {
  const queryClient = useQueryClient();
  const leadNome = item?.card?.lead?.nome ?? "Lead";
  const funilId = item?.card?.funil_id;

  const markDone = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const res = await fetch(`/api/follow-ups/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done_at: new Date().toISOString() }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      notifySuccess("Follow-up concluído");
      onClose();
    },
    onError: (err) => notifyError(`Falha: ${(err as Error).message}`),
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-[color:var(--warning-color)]" />
            Follow-up
          </DialogTitle>
          {item && (
            <DialogDescription>
              {leadNome} · {formatDate(item.due_date)}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          {funilId && (
            <Link
              href={`/crm/${funilId}`}
              className="inline-flex items-center justify-center rounded-[9px] border border-[color:var(--border-strong)] px-3 py-1.5 text-sm hover:bg-accent"
              onClick={onClose}
            >
              Abrir funil
            </Link>
          )}
          <Button
            type="button"
            disabled={markDone.isPending}
            onClick={() => markDone.mutate()}
          >
            <Check className="size-3.5" />
            {markDone.isPending ? "Salvando..." : "Marcar feito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
