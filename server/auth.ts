import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/server/api-helpers";
import type { Database, UserRole } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["users"]["Row"];

export interface AuthContext {
  user: { id: string; email?: string };
  profile: Profile;
  supabase: ReturnType<typeof createClient>;
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError("UNAUTHORIZED");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) {
    throw new ApiError("FORBIDDEN", "Conta inativa ou inexistente");
  }

  return { user: { id: user.id, email: user.email }, profile, supabase };
}

export async function requireRole(
  ...roles: [UserRole, ...UserRole[]]
): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.profile.role)) {
    throw new ApiError("FORBIDDEN", "Permissão insuficiente");
  }
  return ctx;
}

export async function requireAdmin(): Promise<AuthContext> {
  return requireRole("admin");
}

// Bloqueia closer e financeiro de mutations de CRM (cards, leads, automações).
// Financeiro tem visao global mas e read-only.
export async function requireCrmWrite(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.profile.role === "closer" || ctx.profile.role === "financeiro") {
    throw new ApiError("FORBIDDEN", "Permissão insuficiente");
  }
  return ctx;
}
