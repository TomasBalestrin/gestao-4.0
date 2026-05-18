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

function nullify<T extends string | null | undefined>(value: T): string | null {
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

    const d = parsed.data;
    const patch: LeadUpdate = {};
    if (d.nome !== undefined) patch.nome = d.nome;
    if (d.telefone !== undefined) patch.telefone = nullify(d.telefone);
    if (d.email !== undefined) patch.email = nullify(d.email);
    if (d.instagram !== undefined) patch.instagram = nullify(d.instagram);
    if (d.empresa !== undefined) patch.empresa = nullify(d.empresa);
    if (d.nicho !== undefined) patch.nicho = nullify(d.nicho);
    if (d.faturamento_mensal !== undefined) {
      patch.faturamento_mensal = d.faturamento_mensal;
    }
    if (d.tem_socio !== undefined) patch.tem_socio = d.tem_socio;
    if (d.funil_origem !== undefined) patch.funil_origem = d.funil_origem;
    if (d.sdr_id !== undefined) patch.sdr_id = d.sdr_id;
    if (d.produto_ofertado !== undefined) {
      patch.produto_ofertado = d.produto_ofertado;
    }
    if (d.dor_principal !== undefined) patch.dor_principal = d.dor_principal;
    if (d.observacoes !== undefined) patch.observacoes = d.observacoes;
    if (d.data_followup !== undefined) {
      patch.data_followup = nullify(d.data_followup);
    }

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
