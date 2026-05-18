"use client";

import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface FollowUpRow {
  id: string;
  card_id: string;
  user_id: string;
  due_date: string;
  done_at: string | null;
  created_at: string;
  card: {
    id: string;
    funil_id: string;
    lead: { id: string; nome: string } | null;
  } | null;
}

interface FollowUpItemProps {
  item: FollowUpRow;
}

function formatDate(iso: string): string {
  // Trata yyyy-mm-dd como local pra evitar deslocamento de fuso.
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function FollowUpItem({ item }: FollowUpItemProps) {
  const queryClient = useQueryClient();
  const leadNome = item.card?.lead?.nome ?? "Lead";
  const funilId = item.card?.funil_id;

  const markDone = useMutation({
    mutationFn: async () => {
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
    },
    onError: (err) =>
      notifyError(`Falha: ${(err as Error).message}`),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(item.due_date + "T00:00:00");
  const overdue = due < today;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border p-3 text-sm",
        overdue ? "border-destructive/40 bg-destructive/5" : "bg-card"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <CalendarCheck className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate font-medium">{leadNome}</p>
          <p className="text-xs text-muted-foreground">
            Follow-up em {formatDate(item.due_date)}
            {overdue && " (atrasado)"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {funilId && (
          <Link
            href={`/crm/${funilId}`}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Abrir funil
          </Link>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={markDone.isPending}
          onClick={() => markDone.mutate()}
        >
          <Check className="size-3.5" />
          Feito
        </Button>
      </div>
    </div>
  );
}
