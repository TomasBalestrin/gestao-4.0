import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { userRoleSchema } from "@/lib/schemas/funil";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/lib/utils/password-generator";
import { logEvent } from "@/lib/audit/logger";
import {
  ApiError,
  badRequest,
  conflict,
  handleApiError,
  ok,
} from "@/server/api-helpers";

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  nome: z.string().min(1, "Nome obrigatório").max(120),
  role: userRoleSchema,
});

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      console.error("[GET /api/users]", error);
      throw new ApiError("INTERNAL", "Falha ao listar usuários");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/users");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAdmin();

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const admin = createAdminClient();
    const temporaryPassword = generateTemporaryPassword();

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: parsed.data.email,
        password: temporaryPassword,
        email_confirm: true,
      });
    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes("already")) {
        return conflict("Já existe um usuário com este email");
      }
      console.error("[POST /api/users] createUser", authError);
      throw new ApiError("INTERNAL", "Falha ao criar usuário de autenticação");
    }

    const { data: profile, error: insertError } = await admin
      .from("users")
      .insert({
        id: authData.user.id,
        email: parsed.data.email,
        nome: parsed.data.nome,
        role: parsed.data.role,
        must_change_password: true,
        is_active: true,
      })
      .select()
      .single();
    if (insertError || !profile) {
      console.error("[POST /api/users] insert profile", insertError);
      await admin.auth.admin.deleteUser(authData.user.id);
      throw new ApiError("INTERNAL", "Falha ao criar perfil do usuário");
    }

    // Envio de email com a senha temporária depende de SMTP configurado no
    // Supabase. Sem isso, a senha é devolvida ao admin para repasse manual.
    try {
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: parsed.data.email,
      });
    } catch (err) {
      console.error("[POST /api/users] generateLink (email)", err);
    }

    await logEvent({
      entityType: "user",
      entityId: profile.id,
      eventType: "user_created",
      userId: user.id,
      after: { email: profile.email, nome: profile.nome, role: profile.role },
    });

    return ok({ user: profile, temporaryPassword }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/users");
  }
}
