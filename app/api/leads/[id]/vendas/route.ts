import { NextRequest } from "next/server";

import { requireAuth, requireRole } from "@/server/auth";
import { createVendaSchema } from "@/lib/schemas/venda";
import { logEvent } from "@/lib/audit/logger";
import type { Database } from "@/lib/database.types";
import {
  ApiError,
  badRequest,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

type VendaInsert = Database["public"]["Tables"]["vendas"]["Insert"];

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("vendas")
      .select(
        "*, registered_by_user:users!vendas_registered_by_fkey(id, nome, foto_url)"
      )
      .eq("lead_id", params.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[GET /api/leads/[id]/vendas]", error);
      throw new ApiError("INTERNAL", "Falha ao listar vendas");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/leads/[id]/vendas");
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // Apenas admin OU closer podem registrar venda.
    const { user, supabase } = await requireRole("admin", "closer");

    const body = await req.json();
    const parsed = createVendaSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    // Confirma que o lead existe e nao esta deletado.
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!lead) return notFound("Lead não encontrado");

    const insertPayload: VendaInsert = {
      lead_id: params.id,
      card_id: parsed.data.card_id ?? null,
      valor_venda: parsed.data.valor_venda,
      valor_entrada: parsed.data.valor_entrada ?? null,
      vigencia_contrato: parsed.data.vigencia_contrato ?? null,
      negociacao: parsed.data.negociacao ?? null,
      notas: parsed.data.notas ?? null,
      registered_by: user.id,
    };

    const { data: venda, error } = await supabase
      .from("vendas")
      .insert(insertPayload)
      .select()
      .single();
    if (error || !venda) {
      console.error("[POST /api/leads/[id]/vendas]", error);
      throw new ApiError("INTERNAL", "Falha ao registrar venda");
    }

    await logEvent({
      entityType: "venda",
      entityId: venda.id,
      eventType: "venda_created",
      userId: user.id,
      after: venda,
      metadata: { lead_id: params.id, card_id: parsed.data.card_id ?? null },
    });

    return ok(venda, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/leads/[id]/vendas");
  }
}
