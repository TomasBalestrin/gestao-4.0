"use client";

import { useState } from "react";
import { Loader2, Phone } from "lucide-react";

import type { UserRole } from "@/lib/database.types";
import type { CallAnalysisStatus } from "@/types/domain";
import { useCallAnalysesByLead } from "@/hooks/useCallAnalyses";
import { CallAnalysisDetailDialog } from "@/components/calls/call-analysis-detail-dialog";

interface Props {
  leadId: string;
  active: boolean;
  role: UserRole;
}

const STATUS_LABEL: Record<CallAnalysisStatus, string> = {
  pending: "Pendente",
  processing: "Processando",
  matched: "Vinculada",
  unmatched: "Sem lead",
  failed: "Falha",
};

function scoreTone(score: number | null): string {
  if (score === null) return "text-text-muted";
  if (score >= 8) return "text-emerald-500";
  if (score >= 6) return "text-amber-500";
  return "text-red-500";
}

export function KanbanCardModalCallAnalysis({ leadId, active, role }: Props) {
  const query = useCallAnalysesByLead(active ? leadId : null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  const analyses = query.data?.data ?? [];

  if (analyses.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Phone className="h-8 w-8 text-text-muted" />
        <div>
          <p className="font-medium">Nenhuma análise de call</p>
          <p className="mt-1 text-sm text-text-muted">
            As análises aparecem aqui quando o sistema processa transcrições
            vinculadas a este lead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-3">
        {analyses.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedId(a.id)}
            className="w-full rounded-xl border border-border p-4 text-left transition-colors hover:border-[var(--text-muted)]"
          >
            <div className="flex items-start gap-4">
              <div
                className={`text-2xl font-semibold tabular-nums ${scoreTone(
                  a.call_score
                )}`}
              >
                {a.call_score?.toFixed(1) ?? "—"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {a.client_name_extracted ?? "Sem nome"}
                  </span>
                  <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px]">
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-text-muted">
                  {a.google_file_name}
                </div>
                <div className="mt-1 text-[11px] text-text-muted">
                  {new Date(a.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <CallAnalysisDetailDialog
        analysisId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        role={role}
      />
    </div>
  );
}
