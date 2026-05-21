"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { CallEtapa, EtapaStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface Props {
  etapa: CallEtapa;
}

function statusColor(s: EtapaStatus) {
  if (s === "sim") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (s === "parcial") return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  return "bg-red-500/15 text-red-400 border-red-500/20";
}

function statusLabel(s: EtapaStatus) {
  if (s === "sim") return "Aconteceu";
  if (s === "parcial") return "Parcial";
  return "Não aconteceu";
}

function notaColor(n: number) {
  if (n >= 7) return "text-emerald-400";
  if (n >= 4) return "text-amber-400";
  return "text-red-400";
}

export function CallAnalysisEtapaCard({ etapa }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors rounded-lg"
      >
        <span className="text-xs font-mono text-text-muted w-4 shrink-0 mt-0.5">
          {etapa.ordem}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{etapa.nome}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", statusColor(etapa.aconteceu))}>
              {statusLabel(etapa.aconteceu)}
            </span>
            <span className={cn("text-xs font-bold ml-auto shrink-0", notaColor(etapa.nota))}>
              {etapa.nota.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{etapa.funcao_cumprida}</p>
        </div>
        <span className="text-text-muted shrink-0 mt-0.5">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {etapa.evidencias.length > 0 && (
            <Section label="Evidências">
              <ul className="space-y-1">
                {etapa.evidencias.map((e, i) => (
                  <li key={i} className="text-xs text-text-muted italic border-l-2 border-border pl-2">
                    &ldquo;{e}&rdquo;
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid grid-cols-2 gap-3">
            {etapa.ponto_forte && (
              <Section label="Ponto forte">
                <p className="text-xs text-emerald-400">{etapa.ponto_forte}</p>
              </Section>
            )}
            {etapa.ponto_fraco && (
              <Section label="Ponto fraco">
                <p className="text-xs text-red-400">{etapa.ponto_fraco}</p>
              </Section>
            )}
          </div>

          {etapa.erro_de_execucao && (
            <Section label="Erro de execução">
              <p className="text-xs text-text-muted">{etapa.erro_de_execucao}</p>
            </Section>
          )}

          {etapa.impacto_no_lead && (
            <Section label="Impacto no lead">
              <p className="text-xs text-text-muted">{etapa.impacto_no_lead}</p>
            </Section>
          )}

          {etapa.como_corrigir.length > 0 && (
            <Section label="Como corrigir">
              <ul className="space-y-0.5">
                {etapa.como_corrigir.map((c, i) => (
                  <li key={i} className="text-xs text-text-muted">• {c}</li>
                ))}
              </ul>
            </Section>
          )}

          {(etapa.frase_melhor.antes || etapa.frase_melhor.depois) && (
            <Section label="Frase melhor">
              <div className="space-y-1">
                {etapa.frase_melhor.antes && (
                  <div className="text-xs">
                    <span className="text-red-400 font-medium">Antes: </span>
                    <span className="text-text-muted italic">&ldquo;{etapa.frase_melhor.antes}&rdquo;</span>
                  </div>
                )}
                {etapa.frase_melhor.depois && (
                  <div className="text-xs">
                    <span className="text-emerald-400 font-medium">Depois: </span>
                    <span className="text-text-muted italic">&ldquo;{etapa.frase_melhor.depois}&rdquo;</span>
                  </div>
                )}
              </div>
            </Section>
          )}

          {etapa.perguntas_de_aprofundamento.length > 0 && (
            <Section label="Perguntas de aprofundamento">
              <ul className="space-y-0.5">
                {etapa.perguntas_de_aprofundamento.map((q, i) => (
                  <li key={i} className="text-xs text-text-muted">• {q}</li>
                ))}
              </ul>
            </Section>
          )}

          {etapa.risco_principal && (
            <Section label="Risco principal">
              <p className="text-xs text-amber-400">{etapa.risco_principal}</p>
            </Section>
          )}

          {etapa.motivo_ausencia && (
            <Section label="Motivo da ausência">
              <p className="text-xs text-text-muted">{etapa.motivo_ausencia}</p>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">{label}</p>
      {children}
    </div>
  );
}
