"use client";

import { useQuery } from "@tanstack/react-query";

import type { AuditLogFilters } from "@/hooks/useAuditLog";
import { ENTITY_LABELS, EVENT_LABELS } from "@/hooks/useAuditLog";
import type { AuditEntityType, AuditEventType, User } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ENTITY_TYPES = Object.keys(ENTITY_LABELS) as AuditEntityType[];
const EVENT_TYPES = Object.keys(EVENT_LABELS) as AuditEventType[];

interface HistoricoFiltersProps {
  value: AuditLogFilters;
  onChange: (next: AuditLogFilters) => void;
}

export function HistoricoFilters({ value, onChange }: HistoricoFiltersProps) {
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const body = (await res.json().catch(() => null)) as
        | { data?: User[] }
        | null;
      if (!res.ok) return [] as User[];
      return body?.data ?? [];
    },
  });

  function patch(p: Partial<AuditLogFilters>) {
    onChange({ ...value, ...p, page: 1 });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Entidade</Label>
        <Select
          value={value.entity_type || "all"}
          onValueChange={(v) =>
            patch({ entity_type: v === "all" ? "" : (v as AuditEntityType) })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ENTITY_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Evento</Label>
        <Select
          value={value.event_type || "all"}
          onValueChange={(v) =>
            patch({ event_type: v === "all" ? "" : (v as AuditEventType) })
          }
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {EVENT_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Usuário</Label>
        <Select
          value={value.user_id || "all"}
          onValueChange={(v) => patch({ user_id: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(usersQuery.data ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">De</Label>
        <Input
          type="date"
          className="w-36"
          value={value.from?.slice(0, 10) ?? ""}
          onChange={(e) =>
            patch({ from: e.target.value ? `${e.target.value}T00:00:00.000Z` : "" })
          }
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Até</Label>
        <Input
          type="date"
          className="w-36"
          value={value.to?.slice(0, 10) ?? ""}
          onChange={(e) =>
            patch({ to: e.target.value ? `${e.target.value}T23:59:59.999Z` : "" })
          }
        />
      </div>
    </div>
  );
}
