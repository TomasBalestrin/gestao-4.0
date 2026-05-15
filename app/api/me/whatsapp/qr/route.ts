import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, notFound, ok } from "@/server/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getInstanceStatus,
  NextApiError,
} from "@/lib/whatsapp/nextapi-client";
import type { Database, WaInstanceStatus } from "@/lib/database.types";

type WaInstanceUpdate = Database["public"]["Tables"]["wa_instances"]["Update"];

function mapNextApiStatus(s: string | undefined | null): WaInstanceStatus {
  if (s === "open" || s === "connected") return "connected";
  if (s === "close" || s === "disconnected") return "disconnected";
  if (s === "qr" || s === "qr_pending") return "qr_pending";
  return "pending";
}

export async function GET(_req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const admin = createAdminClient();

    const { data: instance } = await admin
      .from("wa_instances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!instance) return notFound("Instância não encontrada");

    try {
      const status = await getInstanceStatus(
        instance.nextapi_instance_id,
        instance.nextapi_instance_token
      );
      const patch: WaInstanceUpdate = {
        status: mapNextApiStatus(status.status),
      };
      if (status.qrCode) {
        patch.last_qr_code = status.qrCode;
        patch.last_qr_at = new Date().toISOString();
      }
      if (status.phoneNumber) patch.phone_number = status.phoneNumber;
      await admin.from("wa_instances").update(patch).eq("id", instance.id);
    } catch (err) {
      if (err instanceof NextApiError) {
        console.error("[qr] NextAPI erro", err);
      } else {
        throw err;
      }
    }

    const { data: refreshed } = await admin
      .from("wa_instances")
      .select("*")
      .eq("id", instance.id)
      .single();

    return ok({ instance: refreshed });
  } catch (err) {
    return handleApiError(err, "GET /api/me/whatsapp/qr");
  }
}
