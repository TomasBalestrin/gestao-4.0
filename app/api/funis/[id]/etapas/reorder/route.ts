import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
import { reorderEtapasSchema } from "@/lib/schemas/etapa";
import { logEvent } from "@/lib/audit/logger";
import {
  ApiError,
  badRequest,
  handleApiError,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

// Offset usado na 1ª passada para evitar colisão com a UNIQUE(funil_id, ordem).
const OFFSET = 100_000;

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();

    const body = await req.json();
    const parsed = reorderEtapasSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const pairs = parsed.data.ordem;
    const ids = pairs.map((p) => p.id);
    const targetOrdens = pairs.map((p) => p.ordem);
    if (new Set(ids).size !== ids.length) {
      return badRequest("IDs de etapa duplicados");
    }
    if (new Set(targetOrdens).size !== targetOrdens.length) {
      return badRequest("Valores de ordem duplicados");
    }

    const { data: current, error: currentError } = await supabase
      .from("etapas")
      .select("id, ordem")
      .eq("funil_id", params.id);
    if (currentError) {
      console.error("[reorder etapas] fetch current", currentError);
      throw new ApiError("INTERNAL", "Falha ao carregar etapas");
    }
    const currentMap = new Map((current ?? []).map((e) => [e.id, e.ordem]));
    for (const id of ids) {
      if (!currentMap.has(id)) {
        return badRequest("Etapa não pertence a este funil");
      }
    }

    // Passada 1: deslocar para faixa temporária (mantém unicidade entre si).
    for (const { id, ordem } of pairs) {
      const { error } = await supabase
        .from("etapas")
        .update({ ordem: ordem + OFFSET })
        .eq("id", id)
        .eq("funil_id", params.id);
      if (error) {
        console.error("[reorder etapas] phase 1", error);
        throw new ApiError("INTERNAL", "Falha ao reordenar etapas (fase 1)");
      }
    }

    // Passada 2: aplicar ordem final.
    for (const { id, ordem } of pairs) {
      const { error } = await supabase
        .from("etapas")
        .update({ ordem })
        .eq("id", id)
        .eq("funil_id", params.id);
      if (error) {
        console.error("[reorder etapas] phase 2", error);
        throw new ApiError("INTERNAL", "Falha ao reordenar etapas (fase 2)");
      }
    }

    // Audit: um evento por etapa cuja ordem mudou.
    for (const { id, ordem } of pairs) {
      const oldOrdem = currentMap.get(id);
      if (oldOrdem !== ordem) {
        await logEvent({
          entityType: "etapa",
          entityId: id,
          eventType: "etapa_updated",
          userId: user.id,
          before: { ordem: oldOrdem },
          after: { ordem },
          metadata: { funil_id: params.id, reason: "reorder" },
        });
      }
    }

    return ok({ updated: pairs.length });
  } catch (err) {
    return handleApiError(err, "POST /api/funis/[id]/etapas/reorder");
  }
}
