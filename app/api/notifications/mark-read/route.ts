import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/server/auth";
import {
  ApiError,
  badRequest,
  handleApiError,
  ok,
} from "@/server/api-helpers";

const markReadSchema = z
  .object({
    ids: z.array(z.string().uuid()).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => v.all || (v.ids && v.ids.length > 0), {
    message: "Informe ids ou all",
  });

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth();

    const body = await req.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const now = new Date().toISOString();
    let query = supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (!parsed.data.all && parsed.data.ids) {
      query = query.in("id", parsed.data.ids);
    }

    const { error } = await query;
    if (error) {
      console.error("[POST /api/notifications/mark-read]", error);
      throw new ApiError("INTERNAL", "Falha ao marcar como lidas");
    }

    return ok({ updated: true });
  } catch (err) {
    return handleApiError(err, "POST /api/notifications/mark-read");
  }
}
