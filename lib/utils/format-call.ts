import type { CallStatus } from "@/hooks/useCalls";

export const STATUS_LABEL: Record<CallStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
  no_show: "No-show",
};

export const STATUS_TONE: Record<CallStatus, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-destructive/10 text-destructive",
};

export function formatCallDateTime(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const data = s.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const hi = s.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const hf = e.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} · ${hi} – ${hf}`;
}
