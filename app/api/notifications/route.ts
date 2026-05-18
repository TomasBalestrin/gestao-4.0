import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1") || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error("[GET /api/notifications]", error);
      throw new ApiError("INTERNAL", "Falha ao listar notificações");
    }

    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/notifications");
  }
}
