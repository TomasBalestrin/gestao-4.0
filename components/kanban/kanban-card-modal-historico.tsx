"use client";

import { CardHistoryTimeline } from "@/components/audit/card-history-timeline";

interface KanbanCardModalHistoricoProps {
  cardId: string;
}

export function KanbanCardModalHistorico({
  cardId,
}: KanbanCardModalHistoricoProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-3">
        <h2 className="text-sm font-semibold">Histórico</h2>
        <p className="text-xs text-muted-foreground">
          Eventos registrados deste card.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <CardHistoryTimeline cardId={cardId} />
      </div>
    </div>
  );
}
