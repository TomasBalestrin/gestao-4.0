import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth, requireAdmin } from "@/server/auth";
import type { Json } from "@/lib/database.types";
import {
  ApiError,
  badRequest,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { key: string };
}

const patchSchema = z.object({
  value: z.unknown(),
});

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("configuracoes_globais")
      .select("*")
      .eq("key", params.key)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/configuracoes/[key]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar configuração");
    }
    if (!data) return notFound("Configuração não encontrada");
    return ok(data);
  } catch (err) {
    return handleApiError(err, "GET /api/configuracoes/[key]");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    const value = parsed.data.value as Json;

    // Validação leve: funil de inbound deve apontar para um funil existente.
    if (
      params.key === "inbound_default_funil_id" &&
      typeof value === "string" &&
      value
    ) {
      const { data: funil } = await supabase
        .from("funis")
        .select("id")
        .eq("id", value)
        .maybeSingle();
      if (!funil) return badRequest("Funil não encontrado");
    }

    const { data, error } = await supabase
      .from("configuracoes_globais")
      .upsert(
        { key: params.key, value, updated_by: user.id },
        { onConflict: "key" }
      )
      .select()
      .single();
    if (error || !data) {
      console.error("[PATCH /api/configuracoes/[key]]", error);
      throw new ApiError("INTERNAL", "Falha ao salvar configuração");
    }

    return ok(data);
  } catch (err) {
    return handleApiError(err, "PATCH /api/configuracoes/[key]");
  }
}
