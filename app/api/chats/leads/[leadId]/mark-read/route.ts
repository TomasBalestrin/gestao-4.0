import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { handleApiError, ok } from "@/server/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { user, profile } = await requireAuth();
    const admin = createAdminClient();

    if (profile.role === "admin") {
      return ok({ ok: true, ignored: "admin" });
    }

    const { data: instance } = await admin
      .from("wa_instances")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!instance) return ok({ ok: true });

    await admin
      .from("chat_threads")
      .update({ unread_count: 0 })
      .eq("lead_id", params.leadId)
      .eq("wa_instance_id", instance.id);

    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err, "POST /api/chats/leads/[leadId]/mark-read");
  }
}
