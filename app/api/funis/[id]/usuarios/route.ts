import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { uuidSchema } from "@/lib/schemas/common";
import {
  ApiError,
  badRequest,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

const addUserSchema = z.object({ user_id: uuidSchema });

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();
    const { data: funil } = await supabase
      .from("funis")
      .select("id")
      .eq("id", params.id)
      .maybeSingle();
    if (!funil) return notFound("Funil não encontrado");

    const { data, error } = await supabase
      .from("user_funis")
      .select("user_id")
      .eq("funil_id", params.id);
    if (error) {
      console.error("[GET /api/funis/[id]/usuarios]", error);
      throw new ApiError("INTERNAL", "Falha ao listar acessos");
    }
    return ok((data ?? []).map((r) => r.user_id));
  } catch (err) {
    return handleApiError(err, "GET /api/funis/[id]/usuarios");
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();
    const body = await req.json();
    const parsed = addUserSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { data: funil } = await supabase
      .from("funis")
      .select("id")
      .eq("id", params.id)
      .maybeSingle();
    if (!funil) return notFound("Funil não encontrado");

    const { data: target } = await supabase
      .from("users")
      .select("id, is_active")
      .eq("id", parsed.data.user_id)
      .maybeSingle();
    if (!target || !target.is_active) {
      return badRequest("Usuário inválido");
    }

    const { error } = await supabase
      .from("user_funis")
      .upsert(
        { user_id: parsed.data.user_id, funil_id: params.id },
        { onConflict: "user_id,funil_id", ignoreDuplicates: true }
      );
    if (error) {
      console.error("[POST /api/funis/[id]/usuarios]", error);
      throw new ApiError("INTERNAL", "Falha ao adicionar acesso");
    }
    return ok({ user_id: parsed.data.user_id, funil_id: params.id });
  } catch (err) {
    return handleApiError(err, "POST /api/funis/[id]/usuarios");
  }
}
