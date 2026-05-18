import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
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

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();
    if (params.id === user.id) {
      return badRequest("Não é possível desativar a si mesmo");
    }

    const { data: before } = await supabase
      .from("users")
      .select("id, is_active")
      .eq("id", params.id)
      .maybeSingle();
    if (!before) return notFound("Usuário não encontrado");

    const { data: after, error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", params.id)
      .select("id, is_active")
      .single();
    if (error || !after) {
      console.error("[POST /api/users/[id]/deactivate]", error);
      throw new ApiError("INTERNAL", "Falha ao desativar usuário");
    }

    await logEvent({
      entityType: "user",
      entityId: params.id,
      eventType: "user_deactivated",
      userId: user.id,
      before: { is_active: before.is_active },
      after: { is_active: false },
    });

    return ok({ id: params.id, is_active: false });
  } catch (err) {
    return handleApiError(err, "POST /api/users/[id]/deactivate");
  }
}
