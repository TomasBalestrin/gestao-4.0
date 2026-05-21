"use client";

import type { CallCheck, CheckStatus } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

interface Props {
  checks: CallCheck[];
}

function statusColor(s: CheckStatus) {
  if (s === "ok") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (s === "parcial") return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  return "bg-red-500/15 text-red-400 border-red-500/20";
}

function statusLabel(s: CheckStatus) {
  if (s === "ok") return "OK";
  if (s === "parcial") return "Parcial";
  return "Falhou";
}

export function CallAnalysisChecks({ checks }: Props) {
  if (!checks || checks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {checks.map((check) => (
        <div key={check.codigo} className="rounded-lg border border-border bg-card/40 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-muted">{check.codigo}</span>
              <span className="text-sm font-medium text-foreground">{check.nome}</span>
            </div>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0", statusColor(check.status))}>
              {statusLabel(check.status)}
            </span>
          </div>

          {check.evidencias.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">Evidências</p>
              <ul className="space-y-0.5">
                {check.evidencias.map((e, i) => (
                  <li key={i} className="text-xs text-text-muted italic border-l-2 border-border pl-2">
                    &ldquo;{e}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}

          {check.correcao && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">Correção</p>
              <p className="text-xs text-text-muted">{check.correcao}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
