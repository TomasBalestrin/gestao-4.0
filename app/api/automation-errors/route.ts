import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

// Lista erros de automação não resolvidos (RLS: admin ou dono do card).
// Filtro opcional: ?card_id=<uuid>
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireAuth();
    const cardId = req.nextUrl.searchParams.get("card_id");

    let query = supabase
      .from("automation_errors")
      .select("*, automacao:automacoes(id, nome, action)")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (cardId) query = query.eq("card_id", cardId);

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/automation-errors]", error);
      throw new ApiError("INTERNAL", "Falha ao listar erros de automação");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/automation-errors");
  }
}
