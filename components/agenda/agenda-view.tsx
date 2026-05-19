"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";

import type { UserRole } from "@/lib/database.types";
import { isCloser } from "@/lib/utils/permissions";
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
import { FollowUpDetailModal } from "@/components/agenda/follow-up-detail-modal";
import type { FollowUpRow } from "@/components/agenda/follow-up-item";

const AgendaCalendar = dynamic(
  () => import("@/components/agenda/agenda-calendar"),
  { ssr: false, loading: () => <CalendarSkeleton /> }
);

interface CloserOption {
  id: string;
  nome: string;
}

interface AgendaViewProps {
  currentUserId: string;
  role: UserRole;
}

export function AgendaView({ currentUserId, role }: AgendaViewProps) {
  const lockedToCloser = isCloser(role);
  const { data: calls, isLoading, isError, error } = useCalls();
  const [closerFilter, setCloserFilter] = useState<"all" | string>(
    lockedToCloser ? currentUserId : "all"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | CallStatus>("all");
  const [selectedCall, setSelectedCall] = useState<CallWithCtx | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpRow | null>(
    null
  );

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
    enabled: !lockedToCloser,
  });

  const followUpsQuery = useQuery({
    queryKey: ["follow-ups", currentUserId],
    queryFn: async (): Promise<FollowUpRow[]> => {
      const res = await fetch("/api/follow-ups");
      const body = (await res.json().catch(() => null)) as
        | { data?: FollowUpRow[] }
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
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Calls e follow-ups no mesmo lugar. Cada closer tem uma cor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!lockedToCloser && (
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
          )}
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
        <AgendaCalendar
          calls={filtered}
          followUps={followUpsQuery.data ?? []}
          onSelectCall={setSelectedCall}
          onSelectFollowUp={setSelectedFollowUp}
        />
      )}

      <CallDetailModal
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
      />
      <FollowUpDetailModal
        item={selectedFollowUp}
        onClose={() => setSelectedFollowUp(null)}
      />
    </div>
  );
}
