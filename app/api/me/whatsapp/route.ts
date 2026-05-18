import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("wa_instances")
      .select(
        "id, status, phone_number, last_qr_code, last_qr_at, last_connected_at, last_disconnected_at, created_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/me/whatsapp]", error);
      throw new ApiError("INTERNAL", "Falha ao consultar WhatsApp");
    }
    return ok({ instance: data });
  } catch (err) {
    return handleApiError(err, "GET /api/me/whatsapp");
  }
}
