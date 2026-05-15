import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInstance,
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

export async function POST(_req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("wa_instances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      try {
        const status = await getInstanceStatus(
          existing.nextapi_instance_id,
          existing.nextapi_instance_token
        );
        const newStatus = mapNextApiStatus(status.status);
        const patch: WaInstanceUpdate = { status: newStatus };
        if (status.qrCode) {
          patch.last_qr_code = status.qrCode;
          patch.last_qr_at = new Date().toISOString();
        }
        if (status.phoneNumber) patch.phone_number = status.phoneNumber;
        await admin.from("wa_instances").update(patch).eq("id", existing.id);

        const { data: updated } = await admin
          .from("wa_instances")
          .select("*")
          .eq("id", existing.id)
          .single();
        return ok({ instance: updated });
      } catch (err) {
        if (err instanceof NextApiError) {
          console.error("[connect] erro consultando NextAPI", err);
          throw new ApiError("BUSINESS_RULE", "Falha ao consultar provider");
        }
        throw err;
      }
    }

    let created;
    try {
      created = await createInstance(user.id);
    } catch (err) {
      console.error("[connect] erro criando instância", err);
      throw new ApiError("BUSINESS_RULE", "Falha ao criar instância no provider");
    }

    const now = new Date().toISOString();
    const { data: inserted, error: insertErr } = await admin
      .from("wa_instances")
      .insert({
        user_id: user.id,
        nextapi_instance_id: created.instanceId,
        nextapi_instance_token: created.instanceToken,
        status: created.qrCode ? "qr_pending" : "pending",
        last_qr_code: created.qrCode ?? null,
        last_qr_at: created.qrCode ? now : null,
      })
      .select("*")
      .single();

    if (insertErr || !inserted) {
      console.error("[connect] falha INSERT wa_instances", insertErr);
      throw new ApiError("INTERNAL", "Falha ao persistir instância");
    }

    return ok({ instance: inserted }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/me/whatsapp/connect");
  }
}
