import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, notFound, ok } from "@/server/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteInstance,
  NextApiError,
} from "@/lib/whatsapp/nextapi-client";
import { logEvent } from "@/lib/audit/logger";

export async function POST(_req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const admin = createAdminClient();

    const { data: instance } = await admin
      .from("wa_instances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!instance) return notFound("Nenhuma instância para desconectar");

    try {
      await deleteInstance(
        instance.nextapi_instance_id,
        instance.nextapi_instance_token
      );
    } catch (err) {
      if (err instanceof NextApiError) {
        console.error("[disconnect] NextAPI erro (seguindo)", err);
      } else {
        throw err;
      }
    }

    const { error: delErr } = await admin
      .from("wa_instances")
      .delete()
      .eq("id", instance.id);
    if (delErr) {
      console.error("[disconnect] falha removendo wa_instances", delErr);
      throw new ApiError("INTERNAL", "Falha ao remover instância");
    }

    await logEvent({
      entityType: "wa_instance",
      entityId: instance.id,
      eventType: "wa_instance_disconnected",
      userId: user.id,
      before: { phone_number: instance.phone_number, status: instance.status },
    });

    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err, "POST /api/me/whatsapp/disconnect");
  }
}
