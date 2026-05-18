import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

// GET /api/follow-ups
// Lista os follow-ups pendentes do user autenticado, ordenados por due_date.
// Admin pode passar `?user_id=` para inspecionar outros usuarios.
// Filtros: ?from=yyyy-mm-dd&to=yyyy-mm-dd (inclusivos), ?include_done=1.
export async function GET(req: NextRequest) {
  try {
    const { user, profile, supabase } = await requireAuth();
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("user_id");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const includeDone = url.searchParams.get("include_done") === "1";

    const userId =
      targetUserId && profile.role === "admin" ? targetUserId : user.id;

    let query = supabase
      .from("follow_ups")
      .select(
        "id, card_id, user_id, due_date, done_at, created_at, card:cards(id, funil_id, lead:leads(id, nome))"
      )
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    if (!includeDone) query = query.is("done_at", null);
    if (from) query = query.gte("due_date", from);
    if (to) query = query.lte("due_date", to);

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/follow-ups]", error);
      throw new ApiError("INTERNAL", "Falha ao listar follow-ups");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/follow-ups");
  }
}
