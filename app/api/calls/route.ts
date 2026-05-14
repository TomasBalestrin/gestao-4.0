import { NextRequest } from "next/server";

import { requireAuth, requireCrmWrite } from "@/server/auth";
import { scheduleCallSchema } from "@/lib/schemas/call";
import {
  diaSemanaFromDate,
  generateAvailableSlots,
  type TimeBlock,
} from "@/lib/utils/slot-generator";
import { logEvent } from "@/lib/audit/logger";
import {
  ApiError,
  badRequest,
  conflict,
  errorResponse,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

const CALL_SELECT =
  "*, card:cards(id, funil_id, lead:leads(id, nome, telefone)), closer:users!calls_closer_id_fkey(id, nome, foto_url), scheduler:users!calls_scheduled_by_fkey(id, nome)";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { supabase, profile, user } = ctx;
    const sp = req.nextUrl.searchParams;

    let query = supabase
      .from("calls")
      .select(CALL_SELECT)
      .order("slot_start", { ascending: true });

    const from = sp.get("from");
    const to = sp.get("to");
    const closerId = sp.get("closer_id");
    const cardId = sp.get("card_id");
    if (from) query = query.gte("slot_start", from);
    if (to) query = query.lte("slot_start", to);
    if (closerId) query = query.eq("closer_id", closerId);
    if (cardId) query = query.eq("card_id", cardId);
    if (profile.role === "closer") {
      query = query.eq("closer_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/calls]", error);
      throw new ApiError("INTERNAL", "Falha ao listar calls");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/calls");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireCrmWrite();

    const body = await req.json();
    const parsed = scheduleCallSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    const { card_id, closer_id, slot_start, slot_end, notes } = parsed.data;

    const { data: card } = await supabase
      .from("cards")
      .select("id, funil_id")
      .eq("id", card_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!card) return notFound("Card não encontrado");

    const { data: closer } = await supabase
      .from("users")
      .select("id, nome, role, is_active")
      .eq("id", closer_id)
      .maybeSingle();
    if (!closer || !closer.is_active || closer.role !== "closer") {
      return badRequest("Closer inválido");
    }

    // Valida que o slot pertence à agenda configurada do closer.
    const dateISO = slot_start.slice(0, 10);
    const dia = diaSemanaFromDate(dateISO);
    const { data: config } = await supabase
      .from("closer_horarios")
      .select("blocos, slot_duration_min, buffer_min, ativo")
      .eq("closer_id", closer_id)
      .eq("dia_semana", dia)
      .maybeSingle();
    if (!config || !config.ativo) {
      return errorResponse("BUSINESS_RULE", "Closer indisponível neste dia");
    }

    const { data: dayCalls } = await supabase
      .from("calls")
      .select("slot_start, slot_end")
      .eq("closer_id", closer_id)
      .eq("status", "scheduled")
      .gte("slot_start", `${dateISO}T00:00:00.000Z`)
      .lte("slot_start", `${dateISO}T23:59:59.999Z`);

    const available = generateAvailableSlots({
      dateISO,
      blocks: (config.blocos as unknown as TimeBlock[]) ?? [],
      slotDurationMin: config.slot_duration_min,
      bufferMin: config.buffer_min,
      busyRanges: (dayCalls ?? []).map((c) => ({
        start: c.slot_start,
        end: c.slot_end,
      })),
    });
    const wantStart = new Date(slot_start).getTime();
    const wantEnd = new Date(slot_end).getTime();
    const matches = available.some(
      (s) =>
        new Date(s.start).getTime() === wantStart &&
        new Date(s.end).getTime() === wantEnd
    );
    if (!matches) {
      return errorResponse("BUSINESS_RULE", "Horário indisponível");
    }

    const { data: call, error } = await supabase
      .from("calls")
      .insert({
        card_id,
        closer_id,
        scheduled_by: user.id,
        slot_start,
        slot_end,
        status: "scheduled",
        notes: notes ?? null,
      })
      .select(CALL_SELECT)
      .single();
    if (error || !call) {
      // 23P01 = exclusion_violation (slot já reservado).
      if (error?.code === "23P01") {
        return conflict("Este horário acabou de ser reservado");
      }
      console.error("[POST /api/calls]", error);
      throw new ApiError("INTERNAL", "Falha ao agendar call");
    }

    await logEvent({
      entityType: "call",
      entityId: call.id,
      eventType: "call_scheduled",
      userId: user.id,
      after: { card_id, closer_id, slot_start, slot_end },
    });

    // Notificação in-app para o closer.
    await supabase.from("notifications").insert({
      user_id: closer_id,
      tipo: "call_scheduled",
      titulo: "Nova call agendada",
      descricao: `Agendada por ${user.email ?? "um colega"}`,
      link: "/agenda",
      metadata: { call_id: call.id, card_id },
    });

    return ok(call, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/calls");
  }
}
