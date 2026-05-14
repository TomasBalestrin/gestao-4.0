"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils/cn";
import type { Bloco } from "@/components/horarios/bloco-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DiaKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DIAS: { key: DiaKey; label: string; short: string }[] = [
  { key: "monday", label: "Segunda", short: "Seg" },
  { key: "tuesday", label: "Terça", short: "Ter" },
  { key: "wednesday", label: "Quarta", short: "Qua" },
  { key: "thursday", label: "Quinta", short: "Qui" },
  { key: "friday", label: "Sexta", short: "Sex" },
  { key: "saturday", label: "Sábado", short: "Sáb" },
  { key: "sunday", label: "Domingo", short: "Dom" },
];

// Janela de 07:00 às 24:00 (último slot inicia em 23:50). Granularidade 10 min.
const HOUR_START = 7;
const HOUR_END = 24;
const SLOT_MIN = 10;

const ALL_SLOTS: number[] = (() => {
  const out: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      out.push(h * 60 + m);
    }
  }
  return out;
})();

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function blocosToSlots(blocos: Bloco[]): Set<number> {
  const out = new Set<number>();
  for (const b of blocos) {
    const start = toMinutes(b.inicio);
    const end = toMinutes(b.fim);
    for (let m = start; m < end; m += SLOT_MIN) out.add(m);
  }
  return out;
}

function slotsToBlocos(slots: Set<number>): Bloco[] {
  const sorted = [...slots].sort((a, b) => a - b);
  const blocos: Bloco[] = [];
  let start: number | null = null;
  let prev: number | null = null;
  for (const m of sorted) {
    if (start === null) {
      start = m;
      prev = m;
      continue;
    }
    if (m === (prev ?? 0) + SLOT_MIN) {
      prev = m;
    } else {
      blocos.push({ inicio: fmt(start), fim: fmt((prev ?? start) + SLOT_MIN) });
      start = m;
      prev = m;
    }
  }
  if (start !== null && prev !== null) {
    blocos.push({ inicio: fmt(start), fim: fmt(prev + SLOT_MIN) });
  }
  return blocos;
}

interface DayState {
  ativo: boolean;
  slots: Set<number>;
  slot_duration_min: number;
  buffer_min: number;
}

interface HorarioRow {
  dia_semana: DiaKey;
  blocos: unknown;
  slot_duration_min: number;
  buffer_min: number;
  ativo: boolean;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

function buildState(rows: HorarioRow[] | undefined): Record<DiaKey, DayState> {
  const out = {} as Record<DiaKey, DayState>;
  for (const d of DIAS) {
    out[d.key] = {
      ativo: false,
      slots: new Set(),
      slot_duration_min: 30,
      buffer_min: 0,
    };
  }
  for (const row of rows ?? []) {
    const blocos = Array.isArray(row.blocos) ? (row.blocos as Bloco[]) : [];
    out[row.dia_semana] = {
      ativo: row.ativo,
      slots: blocosToSlots(blocos),
      slot_duration_min: row.slot_duration_min,
      buffer_min: row.buffer_min,
    };
  }
  return out;
}

interface HorarioSlotPickerModalProps {
  closerId: string;
  closerNome: string;
}

const HORARIOS_QUERY = (closerId: string) =>
  ["closer-horarios", closerId] as const;

export function HorarioSlotPickerModal({
  closerId,
  closerNome,
}: HorarioSlotPickerModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="h-4 w-4" />
          Configurar
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[85vh] max-h-[720px] flex-col gap-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Horários — {closerNome}</DialogTitle>
          <DialogDescription>
            Selecione os slots de 10 minutos em que este closer atende.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <HorarioPickerBody closerId={closerId} onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HorarioPickerBody({
  closerId,
  onClose,
}: {
  closerId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: HORARIOS_QUERY(closerId),
    queryFn: () => getJson<HorarioRow[]>(`/api/closer-horarios/${closerId}`),
  });

  const [state, setState] = useState<Record<DiaKey, DayState> | null>(null);
  const [activeDay, setActiveDay] = useState<DiaKey>("monday");
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const [copyFrom, setCopyFrom] = useState<DiaKey | "">("");

  useEffect(() => {
    if (data) setState(buildState(data));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!state) return;
      const dias = DIAS.map((d) => {
        const ds = state[d.key];
        return {
          dia_semana: d.key,
          blocos: ds.ativo ? slotsToBlocos(ds.slots) : [],
          slot_duration_min: ds.slot_duration_min,
          buffer_min: ds.buffer_min,
          ativo: ds.ativo && ds.slots.size > 0,
        };
      }).filter((d) => d.ativo);
      const res = await fetch(`/api/closer-horarios/${closerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dias }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: HORARIOS_QUERY(closerId),
      });
      toast.success("Horários salvos");
      onClose();
    },
    onError: (e) => toast.error(`Falha ao salvar: ${(e as Error).message}`),
  });

  if (isLoading || !state) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
    );
  }

  const day = state[activeDay];

  function patchDay(patch: Partial<DayState>) {
    setState((s) =>
      s ? { ...s, [activeDay]: { ...s[activeDay], ...patch } } : s
    );
  }

  function toggleSlot(minute: number) {
    setState((s) => {
      if (!s) return s;
      const cur = s[activeDay];
      const next = new Set(cur.slots);
      if (next.has(minute)) next.delete(minute);
      else next.add(minute);
      return { ...s, [activeDay]: { ...cur, slots: next, ativo: cur.ativo || next.size > 0 } };
    });
  }

  function selectAllForDay() {
    patchDay({ ativo: true, slots: new Set(ALL_SLOTS) });
  }
  function clearDay() {
    patchDay({ slots: new Set() });
  }
  function toggleHourBlock(hour: number) {
    const hourSlots = ALL_SLOTS.filter((m) => Math.floor(m / 60) === hour);
    const allSelected = hourSlots.every((m) => day.slots.has(m));
    setState((s) => {
      if (!s) return s;
      const cur = s[activeDay];
      const next = new Set(cur.slots);
      if (allSelected) hourSlots.forEach((m) => next.delete(m));
      else hourSlots.forEach((m) => next.add(m));
      return {
        ...s,
        [activeDay]: { ...cur, slots: next, ativo: cur.ativo || next.size > 0 },
      };
    });
  }

  function copyDay() {
    if (!copyFrom || copyFrom === activeDay) return;
    setState((s) => {
      if (!s) return s;
      const src = s[copyFrom];
      return {
        ...s,
        [activeDay]: {
          ativo: src.ativo,
          slots: new Set(src.slots),
          slot_duration_min: src.slot_duration_min,
          buffer_min: src.buffer_min,
        },
      };
    });
    setCopyFrom("");
    toast.success(
      `Horários copiados de ${
        DIAS.find((d) => d.key === copyFrom)?.label ?? ""
      }`
    );
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <Tabs
        value={activeDay}
        onValueChange={(v) => {
          setActiveDay(v as DiaKey);
          setExpandedHour(null);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="w-full shrink-0">
          {DIAS.map((d) => {
            const ds = state[d.key];
            const count = ds.ativo ? ds.slots.size : 0;
            return (
              <TabsTrigger key={d.key} value={d.key} className="flex-1">
                <span className="flex items-center gap-1.5">
                  {d.short}
                  {count > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                      {count}
                    </span>
                  )}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {DIAS.map((d) => (
          <TabsContent
            key={d.key}
            value={d.key}
            className="mt-4 flex-1 overflow-y-auto pr-1"
          >
            <DayPanel
              dayKey={d.key}
              state={state[d.key]}
              expandedHour={expandedHour}
              setExpandedHour={setExpandedHour}
              onPatch={patchDay}
              onToggleSlot={toggleSlot}
              onSelectAll={selectAllForDay}
              onClear={clearDay}
              onToggleHour={toggleHourBlock}
              copyFrom={copyFrom}
              setCopyFrom={setCopyFrom}
              onCopy={copyDay}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-4 flex shrink-0 justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Salvando..." : "Salvar horários"}
        </Button>
      </div>
    </div>
  );
}

interface DayPanelProps {
  dayKey: DiaKey;
  state: DayState;
  expandedHour: number | null;
  setExpandedHour: (h: number | null) => void;
  onPatch: (patch: Partial<DayState>) => void;
  onToggleSlot: (minute: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onToggleHour: (hour: number) => void;
  copyFrom: DiaKey | "";
  setCopyFrom: (v: DiaKey | "") => void;
  onCopy: () => void;
}

function DayPanel({
  dayKey,
  state,
  expandedHour,
  setExpandedHour,
  onPatch,
  onToggleSlot,
  onSelectAll,
  onClear,
  onToggleHour,
  copyFrom,
  setCopyFrom,
  onCopy,
}: DayPanelProps) {
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = HOUR_START; h < HOUR_END; h++) out.push(h);
    return out;
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-background/95 px-1 py-2 backdrop-blur">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={state.ativo}
            onChange={(e) => onPatch({ ativo: e.target.checked })}
          />
          Atende neste dia
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={copyFrom}
            onValueChange={(v) => setCopyFrom(v as DiaKey | "")}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Copiar de..." />
            </SelectTrigger>
            <SelectContent>
              {DIAS.filter((d) => d.key !== dayKey).map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopy}
            disabled={!copyFrom}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSelectAll}>
            Selecionar tudo
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Limpar
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "space-y-1.5 rounded-md border bg-card/40 p-2",
          !state.ativo && "opacity-50"
        )}
      >
        {hours.map((hour) => {
          const hourSlots = ALL_SLOTS.filter(
            (m) => Math.floor(m / 60) === hour
          );
          const selectedCount = hourSlots.filter((m) =>
            state.slots.has(m)
          ).length;
          const isExpanded = expandedHour === hour;
          const allSelected = selectedCount === hourSlots.length;
          return (
            <div
              key={hour}
              className="overflow-hidden rounded-md border bg-background"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() =>
                    setExpandedHour(isExpanded ? null : hour)
                  }
                  disabled={!state.ativo}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                  <span className="font-mono text-sm tabular-nums">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      selectedCount === 0
                        ? "bg-muted text-muted-foreground"
                        : allSelected
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-primary/15 text-primary"
                    )}
                  >
                    {selectedCount}/{hourSlots.length}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  disabled={!state.ativo}
                  onClick={() => onToggleHour(hour)}
                >
                  {allSelected ? "Tirar hora" : "Hora toda"}
                </Button>
              </div>
              {isExpanded && (
                <div className="grid grid-cols-3 gap-1.5 border-t bg-secondary/30 p-2 sm:grid-cols-6">
                  {hourSlots.map((m) => {
                    const active = state.slots.has(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={!state.ativo}
                        onClick={() => onToggleSlot(m)}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-center font-mono text-xs tabular-nums transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-secondary",
                          !state.ativo && "cursor-not-allowed"
                        )}
                      >
                        {fmt(m)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
