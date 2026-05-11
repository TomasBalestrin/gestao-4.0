"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";

import {
  useAvailableSlots,
  type AvailableSlot,
} from "@/hooks/useAvailableSlots";
import { useAgendarCall } from "@/hooks/useAgendarCall";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Closer {
  id: string;
  nome: string;
  foto_url: string | null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function next14Days(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 14; i++) {
    out.push(new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

function slotTime(iso: string): string {
  return iso.slice(11, 16);
}

function dayLabel(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

interface SlotRowProps {
  title: string;
  slots: AvailableSlot[];
  loading: boolean;
  disabled: boolean;
  onPick: (slot: AvailableSlot) => void;
  hideWhenEmpty?: boolean;
}

function SlotRow({
  title,
  slots,
  loading,
  disabled,
  onPick,
  hideWhenEmpty,
}: SlotRowProps) {
  if (loading) return null;
  if (slots.length === 0 && hideWhenEmpty) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {slots.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem horários disponíveis.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {slots.map((s) => (
            <Button
              key={s.start}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onPick(s)}
            >
              {slotTime(s.start)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function CloserSlots({
  closer,
  dateISO,
  disabled,
  onPick,
}: {
  closer: Closer;
  dateISO: string;
  disabled: boolean;
  onPick: (closerId: string, slot: AvailableSlot) => void;
}) {
  const { data, isLoading } = useAvailableSlots(closer.id, dateISO);
  return (
    <SlotRow
      title={closer.nome}
      slots={data ?? []}
      loading={isLoading}
      disabled={disabled}
      onPick={(s) => onPick(closer.id, s)}
    />
  );
}

function DaySlots({
  closerId,
  dateISO,
  disabled,
  onPick,
}: {
  closerId: string;
  dateISO: string;
  disabled: boolean;
  onPick: (closerId: string, slot: AvailableSlot) => void;
}) {
  const { data, isLoading } = useAvailableSlots(closerId, dateISO);
  return (
    <SlotRow
      title={dayLabel(dateISO)}
      slots={data ?? []}
      loading={isLoading}
      disabled={disabled}
      onPick={(s) => onPick(closerId, s)}
      hideWhenEmpty
    />
  );
}

interface AgendarCallModalProps {
  cardId: string;
}

export function AgendarCallModal({ cardId }: AgendarCallModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"date" | "closer">("date");
  const [date, setDate] = useState(todayISO());
  const [closerId, setCloserId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const closersQuery = useQuery({
    queryKey: ["closers"],
    queryFn: async () => {
      const res = await fetch("/api/users/closers");
      const body = (await res.json().catch(() => null)) as
        | { data?: Closer[] }
        | null;
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      return body?.data ?? [];
    },
    enabled: open,
  });
  const closers = closersQuery.data ?? [];

  const agendar = useAgendarCall(() => setOpen(false));

  function pick(targetCloserId: string, slot: AvailableSlot) {
    agendar.mutate({
      card_id: cardId,
      closer_id: targetCloserId,
      slot_start: slot.start,
      slot_end: slot.end,
      notes: notes.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <CalendarPlus className="h-4 w-4" />
          Agendar call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar call</DialogTitle>
          <DialogDescription>
            Escolha um horário disponível de um closer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "date" ? "default" : "outline"}
              onClick={() => setMode("date")}
            >
              Por data
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "closer" ? "default" : "outline"}
              onClick={() => setMode("closer")}
            >
              Por closer
            </Button>
          </div>

          {mode === "date" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-3 rounded-md border p-3">
                {closers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {closersQuery.isLoading
                      ? "Carregando closers..."
                      : "Nenhum closer disponível."}
                  </p>
                ) : (
                  closers.map((c) => (
                    <CloserSlots
                      key={c.id}
                      closer={c}
                      dateISO={date}
                      disabled={agendar.isPending}
                      onPick={pick}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Closer</Label>
                <Select value={closerId || undefined} onValueChange={setCloserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o closer" />
                  </SelectTrigger>
                  <SelectContent>
                    {closers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {closerId && (
                <div className="space-y-3 rounded-md border p-3">
                  {next14Days().map((d) => (
                    <DaySlots
                      key={d}
                      closerId={closerId}
                      dateISO={d}
                      disabled={agendar.isPending}
                      onPick={pick}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
