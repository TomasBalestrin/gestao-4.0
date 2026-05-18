import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("wa_instances")
      .select("*")
      .eq("user_id", params.id)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/users/[id]/whatsapp]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar instância WhatsApp");
    }
    return ok(data ?? null);
  } catch (err) {
    return handleApiError(err, "GET /api/users/[id]/whatsapp");
  }
}
