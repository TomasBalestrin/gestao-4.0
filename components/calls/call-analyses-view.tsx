"use client";

import { useState } from "react";
import Link from "next/link";

import type { UserRole } from "@/lib/database.types";
import { canRecordCalls } from "@/lib/utils/permissions";
import {
  type CallAnalysisListFilters,
  useCallAnalyses,
} from "@/hooks/useCallAnalyses";
import { CallAnalysesFilters } from "@/components/calls/call-analyses-filters";
import { CallAnalysesList } from "@/components/calls/call-analyses-list";
import { CallAnalysisDetailDialog } from "@/components/calls/call-analysis-detail-dialog";
import { Button } from "@/components/ui/button";
import { useSyncCalls } from "@/hooks/useGoogleDrive";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  role: UserRole;
}

export function CallAnalysesView({ role }: Props) {
  const [filters, setFilters] = useState<CallAnalysisListFilters>({
    page: 1,
    per_page: 20,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useCallAnalyses(filters);
  const syncNow = useSyncCalls();

  const handleSync = async () => {
    try {
      const res = await syncNow.mutateAsync();
      const s = res.summary;
      toast.success(
        `${s.processed} processadas, ${s.matched} vinculadas, ${s.unmatched} sem lead`
      );
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no sync");
    }
  };

  return (
    <>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Análise de Calls
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Transcrições do Google Drive analisadas por AI.
          </p>
        </div>
        {canRecordCalls(role) && (
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/closer/google-drive">Configurar Drive</Link>
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncNow.isPending}
            >
              {syncNow.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sincronizar agora
            </Button>
          </div>
        )}
      </header>

      <CallAnalysesFilters
        filters={filters}
        onChange={(next) => setFilters({ ...next, page: 1 })}
        showCloserFilter={role === "admin" || role === "lider"}
      />

      <div className="mt-4">
        <CallAnalysesList
          data={query.data?.data ?? []}
          total={query.data?.total ?? 0}
          page={filters.page ?? 1}
          perPage={filters.per_page ?? 20}
          isLoading={query.isLoading}
          onSelect={setSelectedId}
          onPageChange={(p) => setFilters({ ...filters, page: p })}
          role={role}
        />
      </div>

      <CallAnalysisDetailDialog
        analysisId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        role={role}
      />
    </>
  );
}
