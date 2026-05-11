import { useQuery } from "@tanstack/react-query";

export interface AvailableSlot {
  start: string; // ISO
  end: string; // ISO
}

export const slotsKeys = {
  forCloserDate: (closerId: string, dateISO: string) =>
    ["slots", closerId, dateISO] as const,
};

async function fetchSlots(
  closerId: string,
  dateISO: string
): Promise<AvailableSlot[]> {
  const res = await fetch(
    `/api/closer-horarios/${closerId}/slots?date=${encodeURIComponent(dateISO)}`
  );
  const body = (await res.json().catch(() => null)) as
    | { data?: AvailableSlot[]; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data ?? [];
}

export function useAvailableSlots(
  closerId: string | undefined,
  dateISO: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["slots", closerId ?? "", dateISO ?? ""],
    queryFn: () => fetchSlots(closerId!, dateISO!),
    enabled: enabled && !!closerId && !!dateISO,
    staleTime: 5_000,
  });
}
