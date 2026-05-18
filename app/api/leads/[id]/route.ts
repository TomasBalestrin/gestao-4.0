import { NextRequest } from "next/server";

import { requireAuth, requireCrmWrite } from "@/server/auth";
import { updateLeadSchema } from "@/lib/schemas/lead";
import { logEvent } from "@/lib/audit/logger";
import type { Database } from "@/lib/database.types";
import {
  ApiError,
  badRequest,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

function nullify(value: string | null | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[GET /api/leads/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao buscar lead");
    }
    if (!data) return notFound("Lead não encontrado");
    return ok(data);
  } catch (err) {
    return handleApiError(err, "GET /api/leads/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireCrmWrite();

    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    if (Object.keys(parsed.data).length === 0) {
      return badRequest("Nada para atualizar");
    }

    const { data: before } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!before) return notFound("Lead não encontrado");

    const patch: LeadUpdate = {};
    if (parsed.data.nome !== undefined) patch.nome = parsed.data.nome;
    if (parsed.data.email !== undefined) patch.email = nullify(parsed.data.email);
    if (parsed.data.telefone !== undefined)
      patch.telefone = nullify(parsed.data.telefone);
    if (parsed.data.origem !== undefined) patch.origem = parsed.data.origem;
    if (parsed.data.observacoes !== undefined)
      patch.observacoes = parsed.data.observacoes;

    const { data: after, error } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", params.id)
      .select()
      .single();
    if (error || !after) {
      console.error("[PATCH /api/leads/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao atualizar lead");
    }

    await logEvent({
      entityType: "lead",
      entityId: after.id,
      eventType: "lead_updated",
      userId: user.id,
      before,
      after,
    });

    return ok(after);
  } catch (err) {
    return handleApiError(err, "PATCH /api/leads/[id]");
  }
}

// Soft delete: marca deleted_at.
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireCrmWrite();

    const { data: before } = await supabase
      .from("leads")
      .select("id")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!before) return notFound("Lead não encontrado");

    const { error } = await supabase
      .from("leads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.id);
    if (error) {
      console.error("[DELETE /api/leads/[id]]", error);
      throw new ApiError("INTERNAL", "Falha ao remover lead");
    }

    await logEvent({
      entityType: "lead",
      entityId: params.id,
      eventType: "lead_deleted",
      userId: user.id,
    });

    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/leads/[id]");
  }
}
