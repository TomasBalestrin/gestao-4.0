"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, Loader2, Trash2, UserPlus } from "lucide-react";

import type { UserRole } from "@/lib/database.types";
import type { CallAnalysisJson } from "@/types/domain";
import { isAdmin } from "@/lib/utils/permissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCallAnalysis,
  useDeleteCallAnalysis,
} from "@/hooks/useCallAnalyses";
import { CallAnalysisLinkLeadDialog } from "@/components/calls/call-analysis-link-lead-dialog";

interface Props {
  analysisId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
}

export function CallAnalysisDetailDialog({
  analysisId,
  open,
  onOpenChange,
  role,
}: Props) {
  const query = useCallAnalysis(analysisId);
  const remove = useDeleteCallAnalysis();
  const [linkOpen, setLinkOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const analysis = query.data?.data;
  const analysisJson = (analysis?.analysis_json ?? null) as CallAnalysisJson | null;

  const handleDelete = async () => {
    if (!analysis) return;
    if (!confirm("Excluir esta análise permanentemente?")) return;
    try {
      await remove.mutateAsync(analysis.id);
      toast.success("Análise removida");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Análise da call</DialogTitle>
          </DialogHeader>

          {query.isLoading || !analysis ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-text-muted">Cliente</div>
                  <div className="font-medium">
                    {analysis.client_name_extracted ?? "Não identificado"}
                  </div>
                  {analysis.lead?.nome && (
                    <div className="mt-0.5 text-xs text-text-muted">
                      Lead vinculado: {analysis.lead.nome}
                    </div>
                  )}
                  {analysis.closer?.nome && (
                    <div className="text-xs text-text-muted">
                      Closer: {analysis.closer.nome}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-semibold tabular-nums">
                    {analysis.call_score?.toFixed(1) ?? "—"}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted">
                    Nota
                  </div>
                </div>
              </header>

              {analysisJson?.resumo && (
                <section>
                  <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Resumo
                  </h3>
                  <p className="text-sm">{analysisJson.resumo}</p>
                </section>
              )}

              {analysisJson?.pontos_fortes &&
                analysisJson.pontos_fortes.length > 0 && (
                  <section>
                    <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-500">
                      Pontos fortes
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {analysisJson.pontos_fortes.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-emerald-500">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {analysisJson?.pontos_fracos &&
                analysisJson.pontos_fracos.length > 0 && (
                  <section>
                    <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-amber-500">
                      Pontos fracos
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {analysisJson.pontos_fracos.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-amber-500">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {analysisJson?.sugestoes && analysisJson.sugestoes.length > 0 && (
                <section>
                  <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
                    Sugestões
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {analysisJson.sugestoes.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {analysis.error_message && (
                <section className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm">
                  <div className="font-medium text-red-500">Erro</div>
                  <div className="text-xs text-text-muted">
                    {analysis.error_message}
                  </div>
                </section>
              )}

              {analysis.transcription_text && (
                <section>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs text-text-muted hover:text-foreground"
                    onClick={() => setShowTranscript((s) => !s)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {showTranscript
                      ? "Ocultar transcrição"
                      : "Ver transcrição completa"}
                  </button>
                  {showTranscript && (
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-xs">
                      {analysis.transcription_text}
                    </pre>
                  )}
                </section>
              )}

              <footer className="flex items-center justify-between gap-2 border-t border-border pt-4">
                <div className="text-[11px] text-text-muted">
                  Arquivo: {analysis.google_file_name}
                  {analysis.tokens_used && ` · ${analysis.tokens_used} tokens`}
                </div>
                <div className="flex gap-2">
                  {analysis.status === "unmatched" && (
                    <Button size="sm" onClick={() => setLinkOpen(true)}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Vincular a lead
                    </Button>
                  )}
                  {isAdmin(role) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  )}
                </div>
              </footer>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {analysis && (
        <CallAnalysisLinkLeadDialog
          analysisId={analysis.id}
          closerId={analysis.closer_id}
          open={linkOpen}
          onOpenChange={setLinkOpen}
        />
      )}
    </>
  );
}
