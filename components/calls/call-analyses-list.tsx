"use client";

import { AlertCircle, CheckCircle2, Loader2, UserX } from "lucide-react";

import type { UserRole } from "@/lib/database.types";
import type {
  CallAnalysisStatus,
  CallAnalysisWithRelations,
} from "@/types/domain";
import { canRecordCalls } from "@/lib/utils/permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  data: CallAnalysisWithRelations[];
  total: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
  role: UserRole;
}

const STATUS_ICON: Record<CallAnalysisStatus, JSX.Element> = {
  pending: <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />,
  processing: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  matched: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  unmatched: <UserX className="h-3.5 w-3.5 text-amber-500" />,
  failed: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
};

const STATUS_LABEL: Record<CallAnalysisStatus, string> = {
  pending: "Pendente",
  processing: "Processando",
  matched: "Vinculada",
  unmatched: "Sem lead",
  failed: "Falha",
};

function formatScore(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(1);
}

function scoreTone(score: number | null): string {
  if (score === null) return "text-text-muted";
  if (score >= 8) return "text-emerald-500";
  if (score >= 6) return "text-amber-500";
  return "text-red-500";
}

export function CallAnalysesList({
  data,
  total,
  page,
  perPage,
  isLoading,
  onSelect,
  onPageChange,
  role,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-text-muted">
          Nenhuma análise encontrada.
        </p>
        {canRecordCalls(role) && (
          <p className="mt-2 text-xs text-text-muted">
            Configure seu Google Drive em &quot;Google Drive&quot; e clique em
            &quot;Sincronizar agora&quot; para começar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-[var(--text-muted)]"
        >
          <div className="flex items-start gap-4">
            <div
              className={`text-2xl font-semibold tabular-nums ${scoreTone(
                a.call_score
              )}`}
              aria-label="Nota"
            >
              {formatScore(a.call_score)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-medium">
                  {a.client_name_extracted ?? "Cliente não identificado"}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px]">
                  {STATUS_ICON[a.status]}
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-text-muted">
                {a.google_file_name}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-muted">
                {a.closer?.nome && <span>Closer: {a.closer.nome}</span>}
                {a.lead?.nome && <span>Lead: {a.lead.nome}</span>}
                <span>
                  {new Date(a.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm">
          <div className="text-text-muted">
            Página {page} de {totalPages} ({total} análises)
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
