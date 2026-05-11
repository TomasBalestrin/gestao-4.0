import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("audit_log")
      .select("*, user:users(id, nome)")
      .eq("entity_type", "card")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[GET /api/audit-log/card/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar histórico do card");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/audit-log/card/[id]");
  }
}
