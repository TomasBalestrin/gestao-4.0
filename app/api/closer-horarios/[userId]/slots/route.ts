import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { availableSlotsQuerySchema } from "@/lib/schemas/call";
import {
  diaSemanaFromDate,
  generateAvailableSlots,
  type BusyRange,
  type TimeBlock,
} from "@/lib/utils/slot-generator";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

interface RouteParams {
  params: { userId: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();

    const parsed = availableSlotsQuerySchema.safeParse({
      date: req.nextUrl.searchParams.get("date") ?? undefined,
    });
    if (!parsed.success) return badRequest(parsed.error);
    const dateISO = parsed.data.date;
    const dia = diaSemanaFromDate(dateISO);

    const { data: config, error: cfgError } = await supabase
      .from("closer_horarios")
      .select("blocos, slot_duration_min, buffer_min, ativo")
      .eq("closer_id", params.userId)
      .eq("dia_semana", dia)
      .maybeSingle();
    if (cfgError) {
      console.error("[GET slots] config", cfgError);
      throw new ApiError("INTERNAL", "Falha ao buscar configuração de horário");
    }
    if (!config || !config.ativo) return ok([]);

    const dayStart = `${dateISO}T00:00:00.000Z`;
    const dayEnd = `${dateISO}T23:59:59.999Z`;
    const { data: calls, error: callsError } = await supabase
      .from("calls")
      .select("slot_start, slot_end")
      .eq("closer_id", params.userId)
      .eq("status", "scheduled")
      .gte("slot_start", dayStart)
      .lte("slot_start", dayEnd);
    if (callsError) {
      console.error("[GET slots] calls", callsError);
      throw new ApiError("INTERNAL", "Falha ao buscar calls do dia");
    }

    const busyRanges: BusyRange[] = (calls ?? []).map((c) => ({
      start: c.slot_start,
      end: c.slot_end,
    }));
    const blocks = (config.blocos as unknown as TimeBlock[]) ?? [];

    const slots = generateAvailableSlots({
      dateISO,
      blocks,
      slotDurationMin: config.slot_duration_min,
      bufferMin: config.buffer_min,
      busyRanges,
    });

    return ok(slots);
  } catch (err) {
    return handleApiError(err, "GET /api/closer-horarios/[userId]/slots");
  }
}
