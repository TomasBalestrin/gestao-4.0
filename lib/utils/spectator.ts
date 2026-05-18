import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Retorna true se o usuario eh espectador do funil. Espectador ve cards mas
// nao pode mover/editar (write bloqueado em todas as rotas relevantes).
// Admin nunca eh tratado como spectator aqui (e admin nao precisa passar
// por esse helper porque ja eh autorizado pelo RBAC normal).
export async function isSpectatorOfFunil(
  supabase: SupabaseClient<Database>,
  userId: string,
  funilId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_funis")
    .select("is_spectator")
    .eq("user_id", userId)
    .eq("funil_id", funilId)
    .maybeSingle();
  if (error) {
    console.error("[isSpectatorOfFunil]", error);
    return false;
  }
  return data?.is_spectator === true;
}
