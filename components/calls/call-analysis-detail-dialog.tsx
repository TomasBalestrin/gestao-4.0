"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, FileText, Trash2, UserPlus, X } from "lucide-react";

import type { UserRole } from "@/lib/database.types";
import type { CallAnalysisJson } from "@/types/domain";
import { isAdmin } from "@/lib/utils/permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallAnalysis, useDeleteCallAnalysis } from "@/hooks/useCallAnalyses";
import { CallAnalysisLinkLeadDialog } from "@/components/calls/call-analysis-link-lead-dialog";
import { CallAnalysisEtapaCard } from "@/components/calls/call-analysis-etapa-card";
import { CallAnalysisChecks } from "@/components/calls/call-analysis-checks";
import { cn } from "@/lib/utils/cn";

interface Props {
  analysisId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole;
  userId?: string;
}

const TRANSCRIPT_MIN = 200;
const TRANSCRIPT_MAX = 640;
const TRANSCRIPT_DEFAULT = 288;

function notaColor(n: number) {
  if (n >= 7) return "text-emerald-400";
  if (n >= 4) return "text-amber-400";
  return "text-red-400";
}

function isFullFramework(json: CallAnalysisJson | null): boolean {
  return Array.isArray(json?.etapas) && json!.etapas.length > 0;
}

export function CallAnalysisDetailDialog({ analysisId, open, onOpenChange, role, userId }: Props) {
  const query = useCallAnalysis(analysisId);
  const remove = useDeleteCallAnalysis();
  const [linkOpen, setLinkOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(false);
  const [transcriptWidth, setTranscriptWidth] = useState(TRANSCRIPT_DEFAULT);

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(TRANSCRIPT_DEFAULT);

  const analysis = query.data?.data;
  const json = (analysis?.analysis_json ?? null) as CallAnalysisJson | null;
  const isFull = isFullFramework(json);
  const nota = analysis?.call_score ?? null;
  const hasTranscript = Boolean(analysis?.transcription_text);
  const canDelete = isAdmin(role) || (userId != null && analysis?.closer_id === userId);

  const executeDelete = async () => {
    if (!analysis) return;
    try {
      await remove.mutateAsync(analysis.id);
      toast.success("Análise removida");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setShowTranscriptPanel(false);
      setTranscriptWidth(TRANSCRIPT_DEFAULT);
    }
    onOpenChange(v);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = transcriptWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      // Dragging left = bigger transcript panel
      const delta = dragStartXRef.current - ev.clientX;
      const next = Math.min(TRANSCRIPT_MAX, Math.max(TRANSCRIPT_MIN, dragStartWidthRef.current + delta));
      setTranscriptWidth(next);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "max-h-[90vh] flex flex-col",
            showTranscriptPanel && hasTranscript ? "max-w-5xl" : "max-w-3xl",
          )}
        >
          <DialogHeader>
            <DialogTitle>Análise da call</DialogTitle>
          </DialogHeader>

          {query.isLoading || !analysis ? (
            <div className="space-y-3 flex-1">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Header sempre visível */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground">
                    {analysis.client_name_extracted ?? json?.nome_lead ?? "Cliente não identificado"}
                  </div>
                  {analysis.closer?.nome && (
                    <div className="text-xs text-text-muted">Closer: {analysis.closer.nome}</div>
                  )}
                  {analysis.lead?.nome && (
                    <div className="text-xs text-text-muted">Lead: {analysis.lead.nome}</div>
                  )}
                  {isFull && json?.framework && (
                    <div className="text-xs text-text-muted">{json.framework.nome}</div>
                  )}
                  {isFull && json?.houve_venda && (
                    <span className={cn(
                      "inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium mt-1",
                      json.houve_venda === "sim"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/15 text-red-400 border-red-500/20"
                    )}>
                      {json.houve_venda === "sim" ? "Vendeu" : "Não vendeu"}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-4xl font-bold tabular-nums", notaColor(nota ?? 0))}>
                    {nota?.toFixed(1) ?? "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Nota</div>
                </div>
              </div>

              {/* Área principal: análise + painel de transcrição opcional */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Conteúdo da análise */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
                  {isFull && json ? (
                    <Tabs defaultValue="etapas" className="flex-1 flex flex-col min-h-0">
                      <TabsList className="shrink-0 grid w-full grid-cols-5 text-xs">
                        <TabsTrigger value="etapas">Etapas</TabsTrigger>
                        <TabsTrigger value="checks">Checks</TabsTrigger>
                        <TabsTrigger value="acertos">Acertos/Erros</TabsTrigger>
                        <TabsTrigger value="plano">Plano</TabsTrigger>
                        <TabsTrigger value="lead">Lead</TabsTrigger>
                      </TabsList>

                      <div className="flex-1 overflow-y-auto mt-3">
                        <TabsContent value="etapas" className="space-y-2 mt-0">
                          {json.etapas.map((etapa) => (
                            <CallAnalysisEtapaCard key={etapa.ordem} etapa={etapa} />
                          ))}
                        </TabsContent>

                        <TabsContent value="checks" className="mt-0">
                          <CallAnalysisChecks checks={json.checks ?? []} />
                        </TabsContent>

                        <TabsContent value="acertos" className="space-y-4 mt-0">
                          {json.maiores_acertos?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-emerald-400 mb-2">
                                Maiores acertos
                              </h4>
                              <div className="space-y-2">
                                {json.maiores_acertos.map((a, i) => (
                                  <div key={i} className="rounded-lg border border-border bg-card/40 p-3 space-y-1">
                                    <p className="text-sm font-medium text-emerald-400">{a.acerto}</p>
                                    {a.evidencia && <p className="text-xs text-text-muted italic">&ldquo;{a.evidencia}&rdquo;</p>}
                                    <p className="text-xs text-text-muted">{a.porque_importa}</p>
                                    <p className="text-xs text-text-muted">Como repetir: {a.como_repetir}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {json.maiores_erros?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-red-400 mb-2">
                                Maiores erros
                              </h4>
                              <div className="space-y-2">
                                {json.maiores_erros.map((e, i) => (
                                  <div key={i} className="rounded-lg border border-border bg-card/40 p-3 space-y-1">
                                    <p className="text-sm font-medium text-red-400">{e.erro}</p>
                                    {e.evidencia && <p className="text-xs text-text-muted italic">&ldquo;{e.evidencia}&rdquo;</p>}
                                    <p className="text-xs text-text-muted">Impacto: {e.impacto}</p>
                                    <p className="text-xs text-text-muted">Como corrigir: {e.como_corrigir}</p>
                                    {(e.frase_melhor.antes || e.frase_melhor.depois) && (
                                      <div className="text-xs space-y-0.5 pt-1 border-t border-border">
                                        {e.frase_melhor.antes && <p><span className="text-red-400">Antes:</span> <span className="text-text-muted italic">&ldquo;{e.frase_melhor.antes}&rdquo;</span></p>}
                                        {e.frase_melhor.depois && <p><span className="text-emerald-400">Depois:</span> <span className="text-text-muted italic">&ldquo;{e.frase_melhor.depois}&rdquo;</span></p>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {json.ponto_perda && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                              <h4 className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-1">
                                Ponto de perda: {json.ponto_perda.etapa}
                              </h4>
                              <ul className="space-y-0.5">
                                {json.ponto_perda.sinais.map((s, i) => (
                                  <li key={i} className="text-xs text-text-muted">• {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="plano" className="space-y-3 mt-0">
                          {json.plano_acao && (
                            <>
                              <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
                                <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Ajuste nº 1</h4>
                                <p className="text-xs text-text-muted">{json.plano_acao.ajuste_1.diagnostico}</p>
                                <p className="text-xs text-foreground">{json.plano_acao.ajuste_1.o_que_fazer}</p>
                                <div className="rounded border border-border bg-muted/20 p-2">
                                  <p className="text-[10px] text-text-muted mb-1">Script 30s</p>
                                  <p className="text-xs text-foreground italic">&ldquo;{json.plano_acao.ajuste_1.script_30s}&rdquo;</p>
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-card/40 p-3 space-y-1">
                                <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Treino recomendado</h4>
                                <p className="text-sm font-medium">{json.plano_acao.treino.habilidade}</p>
                                <p className="text-xs text-text-muted">{json.plano_acao.treino.como_treinar}</p>
                                <p className="text-xs text-text-muted">Meta: {json.plano_acao.treino.meta}</p>
                              </div>
                              <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Próxima ação</h4>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted">
                                    {json.plano_acao.proxima_acao.status}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground">{json.plano_acao.proxima_acao.passo}</p>
                                <div className="rounded border border-border bg-muted/20 p-2 flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] text-text-muted mb-1">Mensagem WhatsApp</p>
                                    <p className="text-xs text-foreground">{json.plano_acao.proxima_acao.mensagem_whatsapp}</p>
                                  </div>
                                  <button
                                    type="button"
                                    className="text-text-muted hover:text-foreground shrink-0"
                                    onClick={() => {
                                      void navigator.clipboard.writeText(json!.plano_acao.proxima_acao.mensagem_whatsapp);
                                      toast.success("Mensagem copiada");
                                    }}
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </TabsContent>

                        <TabsContent value="lead" className="space-y-3 mt-0">
                          {json.dados_lead && (
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(json.dados_lead).map(([k, v]) => {
                                if (!v) return null;
                                const label = k.replace(/_/g, " ");
                                const val = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
                                return (
                                  <div key={k} className="rounded border border-border bg-card/40 p-2">
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
                                    <p className="text-xs text-foreground mt-0.5">{val}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {json.tomador_decisao && (
                            <div className="rounded-lg border border-border bg-card/40 p-3">
                              <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Tomador de decisão</h4>
                              <p className="text-xs text-text-muted">
                                Presente: {json.tomador_decisao.presente ? "Sim" : "Não"} ·{" "}
                                Reagendamento por ausência: {json.tomador_decisao.houve_reagendamento ? "Sim" : "Não"}
                              </p>
                              {json.tomador_decisao.motivo && (
                                <p className="text-xs text-text-muted mt-0.5">{json.tomador_decisao.motivo}</p>
                              )}
                            </div>
                          )}
                        </TabsContent>
                      </div>
                    </Tabs>
                  ) : (
                    /* Fallback: schema antigo (5 campos simples) */
                    <div className="space-y-4 overflow-y-auto flex-1">
                      {json?.resumo && (
                        <Section label="Resumo"><p className="text-sm">{json.resumo}</p></Section>
                      )}
                      {json?.pontos_fortes && json.pontos_fortes.length > 0 && (
                        <Section label="Pontos fortes" color="text-emerald-400">
                          <ul className="space-y-1 text-sm">
                            {json.pontos_fortes.map((p, i) => <li key={i}>• {p}</li>)}
                          </ul>
                        </Section>
                      )}
                      {json?.pontos_fracos && json.pontos_fracos.length > 0 && (
                        <Section label="Pontos fracos" color="text-amber-400">
                          <ul className="space-y-1 text-sm">
                            {json.pontos_fracos.map((p, i) => <li key={i}>• {p}</li>)}
                          </ul>
                        </Section>
                      )}
                      {json?.sugestoes && json.sugestoes.length > 0 && (
                        <Section label="Sugestões">
                          <ul className="space-y-1 text-sm">
                            {json.sugestoes.map((p, i) => <li key={i}>• {p}</li>)}
                          </ul>
                        </Section>
                      )}
                    </div>
                  )}
                </div>

                {/* Alça de resize + painel de transcrição */}
                {showTranscriptPanel && hasTranscript && (
                  <>
                    {/* Alça drag para redimensionar */}
                    <div
                      onMouseDown={handleDragStart}
                      className="w-1.5 shrink-0 mx-1 cursor-col-resize rounded-full bg-border hover:bg-primary/60 transition-colors self-stretch"
                      title="Arraste para redimensionar"
                    />
                    {/* Painel da transcrição */}
                    <div
                      style={{ width: transcriptWidth }}
                      className="shrink-0 flex flex-col min-h-0"
                    >
                      <div className="flex items-center justify-between mb-2 shrink-0">
                        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                          Transcrição
                        </span>
                        <button
                          type="button"
                          className="text-text-muted hover:text-foreground"
                          onClick={() => setShowTranscriptPanel(false)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-xs min-h-0">
                        {analysis.transcription_text}
                      </pre>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3 shrink-0">
                <div className="text-[11px] text-text-muted">
                  {analysis.google_file_name}
                  {analysis.tokens_used != null && ` · ${analysis.tokens_used.toLocaleString()} tokens`}
                </div>
                <div className="flex gap-2">
                  {hasTranscript && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTranscriptPanel((s) => !s)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {showTranscriptPanel ? "Ocultar transcrição" : "Ver transcrição"}
                    </Button>
                  )}
                  {analysis.status === "unmatched" && (
                    <Button size="sm" onClick={() => setLinkOpen(true)}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Vincular a lead
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteOpen(true)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão via UI interna */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir análise</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A análise será removida permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void executeDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function Section({ label, color, children }: { label: string; color?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={cn("mb-1 text-xs font-medium uppercase tracking-wider", color ?? "text-text-muted")}>{label}</h3>
      {children}
    </section>
  );
}
