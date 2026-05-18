import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

// Lista os SDRs ativos (id, nome, foto). Usa service role porque a RLS de
// `users` só expõe o próprio registro a não-admins, mas o form de lead precisa
// enxergar a lista de SDRs para vincular ao registro.
export async function GET() {
  try {
    await requireAuth();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id, nome, foto_url")
      .eq("role", "sdr")
      .eq("is_active", true)
      .order("nome", { ascending: true });
    if (error) {
      console.error("[GET /api/users/sdrs]", error);
      throw new ApiError("INTERNAL", "Falha ao listar SDRs");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/users/sdrs");
  }
}
