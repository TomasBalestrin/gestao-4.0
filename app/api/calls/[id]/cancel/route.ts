import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { cancelCallSchema } from "@/lib/schemas/call";
import { logEvent } from "@/lib/audit/logger";
import {
  ApiError,
  badRequest,
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile, supabase } = await requireAuth();
    if (profile.role === "closer" || profile.role === "financeiro") {
      return forbidden("Permissão insuficiente");
    }

    const body = await req.json().catch(() => ({}));
    const parsed = cancelCallSchema.safeParse(body ?? {});
    if (!parsed.success) return badRequest(parsed.error);

    const { data: call } = await supabase
      .from("calls")
      .select("id, status, scheduled_by, notes")
      .eq("id", params.id)
      .maybeSingle();
    if (!call) return notFound("Call não encontrada");

    const isAdmin = profile.role === "admin";
    if (!isAdmin && call.scheduled_by !== user.id) {
      return forbidden("Apenas quem agendou (ou um admin) pode cancelar");
    }
    if (call.status === "cancelled") {
      return ok({ id: call.id, status: "cancelled" });
    }

    const { data: updated, error } = await supabase
      .from("calls")
      .update({
        status: "cancelled",
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        ...(parsed.data.motivo ? { notes: parsed.data.motivo } : {}),
      })
      .eq("id", params.id)
      .select("id, status")
      .single();
    if (error || !updated) {
      console.error("[PATCH /api/calls/[id]/cancel]", error);
      throw new ApiError("INTERNAL", "Falha ao cancelar call");
    }

    await logEvent({
      entityType: "call",
      entityId: params.id,
      eventType: "call_cancelled",
      userId: user.id,
      metadata: { motivo: parsed.data.motivo ?? null },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err, "PATCH /api/calls/[id]/cancel");
  }
}
