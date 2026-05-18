"use client";

import { EVENT_LABELS, useCardHistory } from "@/hooks/useAuditLog";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface CardHistoryTimelineProps {
  cardId: string;
  enabled?: boolean;
}

export function CardHistoryTimeline({
  cardId,
  enabled = true,
}: CardHistoryTimelineProps) {
  const { data, isLoading, isError } = useCardHistory(cardId, enabled);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">Falha ao carregar histórico.</p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sem eventos registrados para este card.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {data.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {EVENT_LABELS[entry.event_type] ?? entry.event_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {fmt(entry.created_at)}
              {entry.user?.nome ? ` · ${entry.user.nome}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
