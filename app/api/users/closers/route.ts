import { requireAuth } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

// Lista os closers ativos (id, nome, foto). Usa service role porque a RLS de
// `users` só expõe o próprio registro a não-admins, mas qualquer autenticado
// precisa enxergar a lista de closers para agendar calls.
export async function GET() {
  try {
    await requireAuth();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id, nome, foto_url")
      .eq("role", "closer")
      .eq("is_active", true)
      .order("nome", { ascending: true });
    if (error) {
      console.error("[GET /api/users/closers]", error);
      throw new ApiError("INTERNAL", "Falha ao listar closers");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/users/closers");
  }
}
