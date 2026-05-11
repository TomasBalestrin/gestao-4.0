"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";

import { useCalls, type CallStatus, type CallWithCtx } from "@/hooks/useCalls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarSkeleton } from "@/components/shared/loading-spinner";
import { CallDetailModal } from "@/components/agenda/call-detail-modal";

const AgendaCalendar = dynamic(
  () => import("@/components/agenda/agenda-calendar"),
  { ssr: false, loading: () => <CalendarSkeleton /> }
);

interface CloserOption {
  id: string;
  nome: string;
}

export default function AgendaPage() {
  const { data: calls, isLoading, isError, error } = useCalls();
  const [closerFilter, setCloserFilter] = useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CallStatus>("all");
  const [selected, setSelected] = useState<CallWithCtx | null>(null);

  const closersQuery = useQuery({
    queryKey: ["closers"],
    queryFn: async () => {
      const res = await fetch("/api/users/closers");
      const body = (await res.json().catch(() => null)) as
        | { data?: CloserOption[] }
        | null;
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      return body?.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return (calls ?? []).filter((c) => {
      if (closerFilter !== "all" && c.closer_id !== closerFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [calls, closerFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Calls agendadas — mês, semana ou dia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={closerFilter}
            onValueChange={(v) => setCloserFilter(v as "all" | string)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Closer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os closers</SelectItem>
              {(closersQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | CallStatus)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="scheduled">Agendada</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="no_show">Não compareceu</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          Falha ao carregar a agenda: {(error as Error).message}
        </p>
      ) : isLoading ? (
        <CalendarSkeleton />
      ) : (
        <AgendaCalendar calls={filtered} onSelectCall={setSelected} />
      )}

      <CallDetailModal call={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
