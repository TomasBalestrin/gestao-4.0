import { NextRequest } from "next/server";

import { requireAuth, requireAdmin } from "@/server/auth";
import { replaceCloserHorariosSchema } from "@/lib/schemas/horario";
import {
  ApiError,
  badRequest,
  handleApiError,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { userId: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("closer_horarios")
      .select("*")
      .eq("closer_id", params.userId);
    if (error) {
      console.error("[GET /api/closer-horarios/[userId]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar horários");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/closer-horarios/[userId]");
  }
}

// PUT substitui toda a configuração: remove os dias antigos e insere os novos.
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = replaceCloserHorariosSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", params.userId)
      .maybeSingle();
    if (!targetUser) return badRequest("Usuário não encontrado");

    const dias = parsed.data.dias;
    const seen = new Set(dias.map((d) => d.dia_semana));
    if (seen.size !== dias.length) {
      return badRequest("Dias da semana duplicados");
    }

    const { error: delError } = await supabase
      .from("closer_horarios")
      .delete()
      .eq("closer_id", params.userId);
    if (delError) {
      console.error("[PUT closer-horarios] delete", delError);
      throw new ApiError("INTERNAL", "Falha ao limpar configuração anterior");
    }

    if (dias.length > 0) {
      const { error: insError } = await supabase
        .from("closer_horarios")
        .insert(
          dias.map((d) => ({
            closer_id: params.userId,
            dia_semana: d.dia_semana,
            blocos: d.blocos,
            slot_duration_min: d.slot_duration_min,
            buffer_min: d.buffer_min,
            ativo: d.ativo ?? true,
          }))
        );
      if (insError) {
        console.error("[PUT closer-horarios] insert", insError);
        throw new ApiError("INTERNAL", "Falha ao salvar configuração");
      }
    }

    const { data } = await supabase
      .from("closer_horarios")
      .select("*")
      .eq("closer_id", params.userId);
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "PUT /api/closer-horarios/[userId]");
  }
}
