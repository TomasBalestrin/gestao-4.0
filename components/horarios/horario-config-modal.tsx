"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { DEFAULT_HORARIO_TEMPLATE } from "@/lib/schemas/horario";
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
import { blocosOverlap, type Bloco } from "@/components/horarios/bloco-editor";
import { DiaTab, type DiaConfig } from "@/components/horarios/dia-tab";

const DIAS = [
  { key: "monday", label: "Seg" },
  { key: "tuesday", label: "Ter" },
  { key: "wednesday", label: "Qua" },
  { key: "thursday", label: "Qui" },
  { key: "friday", label: "Sex" },
  { key: "saturday", label: "Sáb" },
  { key: "sunday", label: "Dom" },
] as const;

export const horariosKeys = {
  byCloser: (closerId: string) => ["closer-horarios", closerId] as const,
};

interface HorarioRow {
  dia_semana: DiaConfig["dia_semana"];
  blocos: unknown;
  slot_duration_min: number;
  buffer_min: number;
  ativo: boolean;
}

function emptyDay(dia: DiaConfig["dia_semana"]): DiaConfig {
  return {
    dia_semana: dia,
    ativo: false,
    slot_duration_min: 30,
    buffer_min: 10,
    blocos: [],
  };
}

function buildState(rows: HorarioRow[] | undefined): DiaConfig[] {
  const byDay = new Map(
    (rows ?? []).map((r) => [
      r.dia_semana,
      {
        dia_semana: r.dia_semana,
        ativo: r.ativo,
        slot_duration_min: r.slot_duration_min,
        buffer_min: r.buffer_min,
        blocos: (Array.isArray(r.blocos) ? r.blocos : []) as Bloco[],
      } as DiaConfig,
    ])
  );
  return DIAS.map((d) => byDay.get(d.key) ?? emptyDay(d.key));
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

interface EditorProps {
  closerId: string;
  closerNome: string;
}

export function HorarioConfigEditor({ closerId, closerNome }: EditorProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: horariosKeys.byCloser(closerId),
    queryFn: () => getJson<HorarioRow[]>(`/api/closer-horarios/${closerId}`),
  });

  const [state, setState] = useState<DiaConfig[]>([]);
  useEffect(() => {
    if (data) setState(buildState(data));
  }, [data]);

  const hasOverlap = state.some((d) => d.ativo && blocosOverlap(d.blocos));

  const save = useMutation({
    mutationFn: async () => {
      const dias = state
        .filter((d) => d.ativo)
        .map((d) => ({
          dia_semana: d.dia_semana,
          blocos: d.blocos.filter((b) => b.inicio && b.fim),
          slot_duration_min: d.slot_duration_min,
          buffer_min: d.buffer_min,
          ativo: true,
        }));
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
        queryKey: horariosKeys.byCloser(closerId),
      });
      toast.success("Horários salvos");
    },
    onError: (err) => toast.error(`Falha ao salvar: ${(err as Error).message}`),
  });

  function applyTemplate() {
    setState(
      DIAS.map((d) => {
        const tpl = DEFAULT_HORARIO_TEMPLATE.find((t) => t.dia_semana === d.key);
        if (tpl) {
          return {
            dia_semana: d.key,
            ativo: true,
            slot_duration_min: tpl.slot_duration_min,
            buffer_min: tpl.buffer_min,
            blocos: tpl.blocos.map((b) => ({ ...b })),
          };
        }
        return emptyDay(d.key);
      })
    );
  }

  if (isLoading || state.length === 0) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configuração de {closerNome}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
          Aplicar template padrão
        </Button>
      </div>

      <Tabs defaultValue="monday">
        <TabsList className="w-full">
          {DIAS.map((d) => (
            <TabsTrigger key={d.key} value={d.key} className="flex-1">
              {d.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {DIAS.map((d, i) => (
          <TabsContent key={d.key} value={d.key}>
            <DiaTab
              config={state[i]!}
              onChange={(next) =>
                setState((s) => s.map((x, idx) => (idx === i ? next : x)))
              }
            />
          </TabsContent>
        ))}
      </Tabs>

      {hasOverlap && (
        <p className="text-sm text-destructive">
          Corrija os blocos sobrepostos antes de salvar.
        </p>
      )}

      <Button
        type="button"
        disabled={save.isPending || hasOverlap}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "Salvando..." : "Salvar horários"}
      </Button>
    </div>
  );
}

interface ModalProps {
  closerId: string;
  closerNome: string;
}

export function HorarioConfigModal({ closerId, closerNome }: ModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="h-4 w-4" />
          Configurar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Horários — {closerNome}</DialogTitle>
          <DialogDescription>
            Defina os blocos disponíveis por dia da semana.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <HorarioConfigEditor closerId={closerId} closerNome={closerNome} />
        )}
      </DialogContent>
    </Dialog>
  );
}
