import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { callAttendanceSchema } from "@/lib/schemas/call";
import { logEvent } from "@/lib/audit/logger";
import {
  ApiError,
  badRequest,
  errorResponse,
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

    const body = await req.json();
    const parsed = callAttendanceSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { data: call } = await supabase
      .from("calls")
      .select("id, status, closer_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!call) return notFound("Call não encontrada");

    const isAdmin = profile.role === "admin";
    if (!isAdmin && call.closer_id !== user.id) {
      return forbidden("Apenas o closer (ou um admin) pode marcar presença");
    }
    if (call.status !== "scheduled") {
      return errorResponse("CONFLICT", "Call não está agendada");
    }

    const { data: updated, error } = await supabase
      .from("calls")
      .update({
        status: parsed.data.status,
        attended_marked_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("id, status")
      .single();
    if (error || !updated) {
      console.error("[PATCH /api/calls/[id]/attendance]", error);
      throw new ApiError("INTERNAL", "Falha ao registrar presença");
    }

    await logEvent({
      entityType: "call",
      entityId: params.id,
      eventType: parsed.data.status === "completed" ? "call_completed" : "call_no_show",
      userId: user.id,
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err, "PATCH /api/calls/[id]/attendance");
  }
}
