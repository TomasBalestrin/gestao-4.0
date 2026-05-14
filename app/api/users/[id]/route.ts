import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth, requireAdmin } from "@/server/auth";
import { userRoleSchema } from "@/lib/schemas/funil";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit/logger";
import type { Database } from "@/lib/database.types";
import {
  ApiError,
  badRequest,
  conflict,
  forbidden,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

const updateUserSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  foto_url: z.string().url().nullable().optional().or(z.literal("")),
  theme_preference: z.enum(["dark", "light", "system"]).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/users/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar usuário");
    }
    if (!data) return notFound("Usuário não encontrado");
    return ok(data);
  } catch (err) {
    return handleApiError(err, "GET /api/users/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile, supabase } = await requireAuth();
    const isAdmin = profile.role === "admin";
    const isSelf = params.id === user.id;
    if (!isAdmin && !isSelf) return forbidden("Sem permissão");

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const patch: UserUpdate = {};
    if (parsed.data.nome !== undefined) patch.nome = parsed.data.nome;
    if (parsed.data.theme_preference !== undefined) {
      patch.theme_preference = parsed.data.theme_preference;
    }
    if (parsed.data.foto_url !== undefined) {
      patch.foto_url = parsed.data.foto_url === "" ? null : parsed.data.foto_url;
    }
    // role e is_active só por admin (e nunca alterando a própria role).
    if (isAdmin) {
      if (parsed.data.role !== undefined && !isSelf) {
        patch.role = parsed.data.role;
      }
      if (parsed.data.is_active !== undefined) {
        patch.is_active = parsed.data.is_active;
      }
    }
    if (Object.keys(patch).length === 0) {
      return badRequest("Nada para atualizar");
    }

    const { data: before } = await supabase
      .from("users")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (!before) return notFound("Usuário não encontrado");

    const { data: after, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", params.id)
      .select()
      .single();
    if (error || !after) {
      console.error("[PATCH /api/users/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao atualizar usuário");
    }

    await logEvent({
      entityType: "user",
      entityId: after.id,
      eventType: "user_updated",
      userId: user.id,
      before: { nome: before.nome, role: before.role, is_active: before.is_active },
      after: { nome: after.nome, role: after.role, is_active: after.is_active },
    });

    return ok(after);
  } catch (err) {
    return handleApiError(err, "PATCH /api/users/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAdmin();
    if (params.id === user.id) {
      return badRequest("Não é possível excluir a si mesmo");
    }

    const { data: target } = await supabase
      .from("users")
      .select("id, nome, email, role")
      .eq("id", params.id)
      .maybeSingle();
    if (!target) return notFound("Usuário não encontrado");

    // calls.closer_id e calls.scheduled_by são ON DELETE RESTRICT — verifica
    // antes pra devolver uma mensagem útil em vez de um 500 de FK.
    const { count: callsAsCloser } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("closer_id", params.id);
    const { count: callsAsScheduler } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_by", params.id);
    const totalCalls = (callsAsCloser ?? 0) + (callsAsScheduler ?? 0);
    if (totalCalls > 0) {
      return conflict(
        "Usuário possui calls associadas. Cancele ou remova as calls antes, ou apenas desative o usuário."
      );
    }

    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(params.id);
    if (authError) {
      console.error("[DELETE /api/users/[id]] deleteUser", authError);
      throw new ApiError("INTERNAL", "Falha ao excluir usuário");
    }

    await logEvent({
      entityType: "user",
      entityId: params.id,
      eventType: "user_deleted",
      userId: user.id,
      before: { email: target.email, nome: target.nome, role: target.role },
    });

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/users/[id]");
  }
}
