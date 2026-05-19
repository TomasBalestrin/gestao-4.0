import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { setupPasswordSchema } from "@/lib/schemas/user";
import { invalidateProfileCache } from "@/lib/supabase/middleware";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth();

    const body = await req.json();
    const parsed = setupPasswordSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { error: pwError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (pwError) {
      throw new ApiError("BUSINESS_RULE", "Não foi possível atualizar a senha");
    }

    const { error: updError } = await supabase
      .from("users")
      .update({ must_change_password: false })
      .eq("id", user.id);
    if (updError) {
      console.error("[POST /api/auth/setup-password] users update", updError);
      throw new ApiError("INTERNAL", "Falha ao atualizar perfil");
    }

    invalidateProfileCache(user.id);

    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err, "POST /api/auth/setup-password");
  }
}
