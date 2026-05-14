export interface TimeBlock {
  inicio: string; // "HH:mm"
  fim: string; // "HH:mm"
}

export interface Slot {
  start: string; // ISO datetime
  end: string; // ISO datetime
}

export interface BusyRange {
  start: string; // ISO datetime
  end: string; // ISO datetime
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return (h ?? 0) * 60 + (m ?? 0);
}

function isoFromDateAndMinutes(dateISO: string, minutes: number): string {
  // 1440 = 24:00 = meia-noite do dia seguinte (boundary de fim de dia).
  if (minutes >= 1440) {
    const next = new Date(`${dateISO}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCMinutes(next.getUTCMinutes() + (minutes - 1440));
    return next.toISOString();
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  // Tratamos os horários como UTC para consistência (TIMESTAMPTZ no banco).
  return `${dateISO}T${hh}:${mm}:00.000Z`;
}

// Gera os slots de um bloco: cada slot dura `slotDurationMin`; entre slots
// aplica-se `bufferMin`. Só inclui slots que cabem inteiramente no bloco.
export function generateSlotsForBlock(
  dateISO: string,
  block: TimeBlock,
  slotDurationMin: number,
  bufferMin: number
): Slot[] {
  const start = toMinutes(block.inicio);
  const end = toMinutes(block.fim);
  if (slotDurationMin <= 0 || start >= end) return [];

  const slots: Slot[] = [];
  let cursor = start;
  while (cursor + slotDurationMin <= end) {
    slots.push({
      start: isoFromDateAndMinutes(dateISO, cursor),
      end: isoFromDateAndMinutes(dateISO, cursor + slotDurationMin),
    });
    cursor += slotDurationMin + bufferMin;
  }
  return slots;
}

function overlaps(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return (
    new Date(a.start).getTime() < new Date(b.end).getTime() &&
    new Date(b.start).getTime() < new Date(a.end).getTime()
  );
}

export interface GenerateAvailableSlotsParams {
  dateISO: string;
  blocks: TimeBlock[];
  slotDurationMin: number;
  bufferMin: number;
  busyRanges?: BusyRange[];
  now?: Date; // slots cujo início <= now são descartados
}

export function generateAvailableSlots({
  dateISO,
  blocks,
  slotDurationMin,
  bufferMin,
  busyRanges = [],
  now = new Date(),
}: GenerateAvailableSlotsParams): Slot[] {
  const all: Slot[] = [];
  for (const block of blocks) {
    all.push(...generateSlotsForBlock(dateISO, block, slotDurationMin, bufferMin));
  }
  const nowMs = now.getTime();
  return all
    .filter((slot) => new Date(slot.start).getTime() > nowMs)
    .filter((slot) => !busyRanges.some((busy) => overlaps(slot, busy)));
}

// Converte uma data ISO (YYYY-MM-DD) para o dia da semana usado no enum.
export function diaSemanaFromDate(
  dateISO: string
):
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday" {
  const dow = new Date(`${dateISO}T00:00:00.000Z`).getUTCDay(); // 0=Sun
  const map = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  return map[dow]!;
}
