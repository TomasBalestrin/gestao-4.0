import { NextRequest } from "next/server";

import { requireAuth, requireAdmin } from "@/server/auth";
import { automacaoSchema } from "@/lib/schemas/automacao";
import type { Json } from "@/lib/database.types";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("automacoes")
      .select("*")
      .eq("etapa_id", params.id)
      .order("ordem", { ascending: true });
    if (error) {
      console.error("[GET /api/etapas/[id]/automacoes]", error);
      throw new ApiError("INTERNAL", "Falha ao listar automações");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/etapas/[id]/automacoes");
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = automacaoSchema.safeParse({ ...body, etapa_id: params.id });
    if (!parsed.success) return badRequest(parsed.error);

    const { data: etapa } = await supabase
      .from("etapas")
      .select("id")
      .eq("id", params.id)
      .maybeSingle();
    if (!etapa) return badRequest("Etapa não encontrada");

    const { data: last } = await supabase
      .from("automacoes")
      .select("ordem")
      .eq("etapa_id", params.id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: automacao, error } = await supabase
      .from("automacoes")
      .insert({
        etapa_id: params.id,
        nome: parsed.data.nome,
        action: parsed.data.action,
        config: parsed.data.config as Json,
        notificacoes: parsed.data.notificacoes as Json,
        ativo: parsed.data.ativo,
        ordem: (last?.ordem ?? -1) + 1,
      })
      .select()
      .single();
    if (error || !automacao) {
      console.error("[POST /api/etapas/[id]/automacoes]", error);
      throw new ApiError("INTERNAL", "Falha ao criar automação");
    }

    return ok(automacao, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/etapas/[id]/automacoes");
  }
}
