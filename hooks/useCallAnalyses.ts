import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CallAnalysisStatus,
  CallAnalysisWithRelations,
} from "@/types/domain";

export interface CallAnalysisListFilters {
  status?: CallAnalysisStatus;
  closer_id?: string;
  lead_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export const callAnalysesKeys = {
  all: ["call-analyses"] as const,
  list: (filters: CallAnalysisListFilters) =>
    ["call-analyses", "list", filters] as const,
  detail: (id: string) => ["call-analyses", "detail", id] as const,
  byLead: (leadId: string) => ["call-analyses", "by-lead", leadId] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) {
    throw new Error(body?.error ?? `Erro ${res.status}`);
  }
  return body!.data as T;
}

function buildQuery(filters: CallAnalysisListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.closer_id) params.set("closer_id", filters.closer_id);
  if (filters.lead_id) params.set("lead_id", filters.lead_id);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface CallAnalysisListResponse {
  data: CallAnalysisWithRelations[];
  total: number;
  page: number;
  per_page: number;
}

export function useCallAnalyses(filters: CallAnalysisListFilters = {}) {
  return useQuery({
    queryKey: callAnalysesKeys.list(filters),
    queryFn: () =>
      fetchJson<CallAnalysisListResponse>(
        `/api/call-analyses${buildQuery(filters)}`
      ),
  });
}

export function useCallAnalysis(id: string | null) {
  return useQuery({
    queryKey: callAnalysesKeys.detail(id ?? ""),
    queryFn: () =>
      fetchJson<{ data: CallAnalysisWithRelations }>(
        `/api/call-analyses/${id}`
      ),
    enabled: Boolean(id),
  });
}

export function useCallAnalysesByLead(leadId: string | null) {
  return useQuery({
    queryKey: callAnalysesKeys.byLead(leadId ?? ""),
    queryFn: () =>
      fetchJson<CallAnalysisListResponse>(
        `/api/call-analyses?lead_id=${leadId}&per_page=50`
      ),
    enabled: Boolean(leadId),
  });
}

export function useLinkCallAnalysisToLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; lead_id: string }) =>
      fetchJson<{ linked: boolean }>(
        `/api/call-analyses/${input.id}/link-lead`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: input.lead_id }),
        }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: callAnalysesKeys.all });
    },
  });
}

export function useDeleteCallAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ deleted: boolean }>(`/api/call-analyses/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: callAnalysesKeys.all });
    },
  });
}
