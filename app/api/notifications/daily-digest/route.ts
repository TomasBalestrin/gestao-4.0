import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { generateDailyDigest } from "@/lib/notifications/daily-digest";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

// POST /api/notifications/daily-digest
// Cria a notificacao consolidada do dia para o user autenticado, com dedup:
// se ja existe uma `daily_digest` criada hoje, retorna `{ skipped: true }`.
export async function POST(_req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth();

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    ).toISOString();

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("tipo", "daily_digest")
      .gte("created_at", startOfDay)
      .maybeSingle();

    if (existing) {
      return ok({ skipped: true, id: existing.id });
    }

    const digest = await generateDailyDigest(supabase, user.id);

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        tipo: "daily_digest",
        titulo: digest.titulo,
        descricao: digest.descricao,
        link: digest.link,
        metadata: {
          calls: digest.callsCount,
          follow_ups: digest.followUpsCount,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("[POST /api/notifications/daily-digest]", error);
      throw new ApiError("INTERNAL", "Falha ao gerar digest");
    }

    return ok({
      skipped: false,
      id: data.id,
      calls: digest.callsCount,
      follow_ups: digest.followUpsCount,
    });
  } catch (err) {
    return handleApiError(err, "POST /api/notifications/daily-digest");
  }
}
