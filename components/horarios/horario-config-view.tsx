import { Clock } from "lucide-react";

import type { Bloco } from "@/components/horarios/bloco-editor";

const DIAS = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

type DiaKey = (typeof DIAS)[number]["key"];

export interface HorarioRow {
  dia_semana: DiaKey;
  blocos: Bloco[];
  slot_duration_min: number;
  buffer_min: number;
  ativo: boolean;
}

interface HorarioConfigViewProps {
  horarios: HorarioRow[];
}

export function HorarioConfigView({ horarios }: HorarioConfigViewProps) {
  const byDay = new Map(horarios.map((h) => [h.dia_semana, h] as const));
  const hasAnyActive = horarios.some((h) => h.ativo && h.blocos.length > 0);

  if (!hasAnyActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <Clock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Horários não configurados</p>
        <p className="text-sm text-muted-foreground">
          Peça para um administrador definir sua disponibilidade.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {DIAS.map((d) => {
        const row = byDay.get(d.key);
        const ativo = !!row?.ativo && (row?.blocos.length ?? 0) > 0;
        return (
          <li
            key={d.key}
            className="space-y-2 rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{d.label}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  ativo
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {ativo ? "Ativo" : "Indisponível"}
              </span>
            </div>
            {ativo && row ? (
              <>
                <ul className="space-y-1">
                  {row.blocos.map((b, i) => (
                    <li
                      key={i}
                      className="rounded-md bg-secondary/50 px-2 py-1 text-sm tabular-nums"
                    >
                      {b.inicio} – {b.fim}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Slots de {row.slot_duration_min} min · buffer{" "}
                  {row.buffer_min} min
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sem blocos.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
