import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { isSpectatorOfFunil } from "@/lib/utils/spectator";
import { handleApiError, ok } from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

// GET /api/funis/[id]/me
// Retorna flags do usuario atual em relacao a este funil. Hoje so
// `is_spectator`, mas a rota fica disponivel pra adicionar mais flags no
// futuro (ex: notification settings, last_viewed).
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile, supabase } = await requireAuth();
    if (profile.role === "admin") {
      return ok({ is_spectator: false });
    }
    const isSpectator = await isSpectatorOfFunil(supabase, user.id, params.id);
    return ok({ is_spectator: isSpectator });
  } catch (err) {
    return handleApiError(err, "GET /api/funis/[id]/me");
  }
}
