import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

// Lista usuarios ativos com papel de "SDR" no sentido amplo: role 'sdr' OU
// 'social_selling'. Usa service role porque a RLS de `users` so expoe o
// proprio registro a nao-admins, mas o form de lead/venda precisa enxergar a
// lista para vincular.
export async function GET() {
  try {
    await requireAuth();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id, nome, foto_url, role")
      .in("role", ["sdr", "social_selling"])
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
