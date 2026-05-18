import { requireAuth } from "@/server/auth";
import { ApiError, handleApiError, ok } from "@/server/api-helpers";

export async function GET() {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("configuracoes_globais")
      .select("*")
      .order("key", { ascending: true });
    if (error) {
      console.error("[GET /api/configuracoes]", error);
      throw new ApiError("INTERNAL", "Falha ao listar configurações");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/configuracoes");
  }
}
