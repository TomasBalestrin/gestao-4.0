"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CallAnalysisListFilters } from "@/hooks/useCallAnalyses";
import type { CallAnalysisStatus } from "@/types/domain";

interface Props {
  filters: CallAnalysisListFilters;
  onChange: (next: CallAnalysisListFilters) => void;
  showCloserFilter: boolean;
}

const STATUS_OPTIONS: { value: CallAnalysisStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "matched", label: "Vinculadas" },
  { value: "unmatched", label: "Sem lead" },
  { value: "processing", label: "Processando" },
  { value: "failed", label: "Falhas" },
];

export function CallAnalysesFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="min-w-[200px] flex-1">
        <Input
          placeholder="Buscar por cliente ou arquivo..."
          value={filters.search ?? ""}
          onChange={(e) =>
            onChange({ ...filters, search: e.target.value || undefined })
          }
        />
      </div>
      <div className="w-[200px]">
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              status:
                v === "all" ? undefined : (v as CallAnalysisStatus),
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
