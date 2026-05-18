import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
import { createEtapaSchema } from "@/lib/schemas/etapa";
import { logEvent } from "@/lib/audit/logger";
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

const createEtapaBodySchema = createEtapaSchema.pick({ nome: true, cor: true });

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = createEtapaBodySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { data: funil } = await supabase
      .from("funis")
      .select("id")
      .eq("id", params.id)
      .maybeSingle();
    if (!funil) return notFound("Funil não encontrado");

    const { data: last } = await supabase
      .from("etapas")
      .select("ordem")
      .eq("funil_id", params.id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrdem = (last?.ordem ?? 0) + 1;

    const { data: etapa, error } = await supabase
      .from("etapas")
      .insert({
        funil_id: params.id,
        nome: parsed.data.nome,
        cor: parsed.data.cor,
        ordem: nextOrdem,
      })
      .select()
      .single();
    if (error || !etapa) {
      console.error("[POST /api/funis/[id]/etapas]", error);
      throw new ApiError("INTERNAL", "Falha ao criar etapa");
    }

    await logEvent({
      entityType: "etapa",
      entityId: etapa.id,
      eventType: "etapa_created",
      userId: user.id,
      after: etapa,
      metadata: { funil_id: params.id },
    });

    return ok(etapa, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/funis/[id]/etapas");
  }
}
