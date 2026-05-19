"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface InstagramWindowCountdownProps {
  expiresAt: string | null;
  className?: string;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

// Mostra quanto tempo resta da janela de 24h do IG.
// Atualiza a cada 30s (granularidade suficiente; resolvedor de minuto).
export function InstagramWindowCountdown({
  expiresAt,
  className,
}: InstagramWindowCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!expiresAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] text-text-muted",
          className
        )}
      >
        <Clock className="size-3" />
        Aguardando primeira mensagem do lead
      </span>
    );
  }

  const expiresMs = new Date(expiresAt).getTime();
  const remaining = expiresMs - now;
  const expired = remaining <= 0;

  if (expired) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--danger-color)]",
          className
        )}
      >
        <AlertTriangle className="size-3" />
        Janela 24h fechada. Aguarde o lead responder.
      </span>
    );
  }

  // Soft warning quando faltam <2h.
  const urgent = remaining < 2 * 60 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] tabular-nums",
        urgent
          ? "font-medium text-[color:var(--warning-color)]"
          : "text-text-muted",
        className
      )}
    >
      <Clock className="size-3" />
      Fecha em {formatRemaining(remaining)}
    </span>
  );
}
