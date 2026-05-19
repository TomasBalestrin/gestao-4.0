import { NextRequest } from "next/server";

import { requireAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { unsubscribePageFromApp } from "@/lib/instagram/graph-client";
import { logEvent } from "@/lib/audit/logger";
import {
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { funilId: string };
}

// GET /api/instagram/instances/[funilId]
// Retorna a instancia do funil (status, ig_username, expira em X dias).
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { data } = await admin
      .from("ig_instances")
      .select(
        "id, funil_id, ig_user_id, ig_username, page_id, status, token_expires_at, last_connected_at, last_disconnected_at, last_refreshed_at"
      )
      .eq("funil_id", params.funilId)
      .maybeSingle();
    return ok(data ?? null);
  } catch (err) {
    return handleApiError(err, "GET /api/instagram/instances/[funilId]");
  }
}

// DELETE /api/instagram/instances/[funilId]
// Desconecta a instancia: unsubscribe da page no app + marca disconnected.
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireAdmin();
    const admin = createAdminClient();

    const { data: instance } = await admin
      .from("ig_instances")
      .select("id, page_id, access_token")
      .eq("funil_id", params.funilId)
      .maybeSingle();
    if (!instance) return notFound("Instancia nao encontrada");

    try {
      await unsubscribePageFromApp({
        pageId: instance.page_id,
        pageAccessToken: instance.access_token,
      });
    } catch (err) {
      console.warn("[ig/disconnect] unsubscribe falhou (seguindo)", err);
    }

    await admin
      .from("ig_instances")
      .update({
        status: "disconnected",
        last_disconnected_at: new Date().toISOString(),
      })
      .eq("id", instance.id);

    await logEvent({
      entityType: "funil",
      entityId: params.funilId,
      eventType: "ig_instance_disconnected",
      userId: user.id,
    });

    return ok({ disconnected: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/instagram/instances/[funilId]");
  }
}
