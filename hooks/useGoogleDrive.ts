import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  GoogleDriveFolderOption,
  GoogleDriveIntegrationPublic,
} from "@/types/domain";
import type { GoogleDriveConfigInput } from "@/lib/schemas/google-drive";
import type { SyncSummary } from "@/lib/google/sync-engine";

export const googleDriveKeys = {
  integration: ["google-drive", "integration"] as const,
  folders: ["google-drive", "folders"] as const,
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

export function useGoogleDriveIntegration() {
  return useQuery({
    queryKey: googleDriveKeys.integration,
    queryFn: () =>
      fetchJson<{ integration: GoogleDriveIntegrationPublic | null }>(
        "/api/google/integrations/me"
      ),
    refetchOnWindowFocus: false,
  });
}

export function useGoogleDriveFolders(enabled: boolean) {
  return useQuery({
    queryKey: googleDriveKeys.folders,
    queryFn: () =>
      fetchJson<{ folders: GoogleDriveFolderOption[] }>("/api/google/folders"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateGoogleDriveConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GoogleDriveConfigInput) =>
      fetchJson<{ updated: boolean }>("/api/google/integrations/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: googleDriveKeys.integration });
    },
  });
}

export function useDisconnectGoogleDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ disconnected: boolean }>("/api/google/oauth/disconnect", {
        method: "POST",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: googleDriveKeys.integration });
    },
  });
}

export function useSyncCalls() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ summary: SyncSummary }>("/api/calls/sync", {
        method: "POST",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["call-analyses"] });
      void qc.invalidateQueries({ queryKey: googleDriveKeys.integration });
    },
  });
}
