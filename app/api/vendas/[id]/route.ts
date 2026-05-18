import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
import { logEvent } from "@/lib/audit/logger";
import {
  ApiError,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();

    const { data: before } = await supabase
      .from("vendas")
      .select("id, lead_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!before) return notFound("Venda não encontrada");

    const { error } = await supabase
      .from("vendas")
      .delete()
      .eq("id", params.id);
    if (error) {
      console.error("[DELETE /api/vendas/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao remover venda");
    }

    await logEvent({
      entityType: "venda",
      entityId: params.id,
      eventType: "venda_deleted",
      userId: user.id,
      metadata: { lead_id: before.lead_id },
    });

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/vendas/[id]");
  }
}
