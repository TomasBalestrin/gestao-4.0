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

function nullify<T extends string | null | undefined>(value: T): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("vendas")
      .select(
        "*, registered_by_user:users!vendas_registered_by_fkey(id, nome, foto_url), sdr:users!vendas_sdr_id_fkey(id, nome, foto_url), funil:funis!vendas_funil_id_fkey(id, nome)"
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

    const d = parsed.data;
    const insertPayload: VendaInsert = {
      lead_id: params.id,
      card_id: d.card_id ?? null,
      valor: d.valor,
      vigencia: nullify(d.vigencia),
      produto: d.produto ?? null,
      nome_completo: d.nome_completo,
      nacionalidade: nullify(d.nacionalidade),
      estado_civil: d.estado_civil ?? null,
      cpf: nullify(d.cpf),
      rg: nullify(d.rg),
      cnpj: nullify(d.cnpj),
      endereco: nullify(d.endereco),
      bairro: nullify(d.bairro),
      cidade: nullify(d.cidade),
      cep: nullify(d.cep),
      instagram: nullify(d.instagram),
      email: nullify(d.email),
      whatsapp: nullify(d.whatsapp),
      data_nascimento: nullify(d.data_nascimento),
      forma_pagamento: d.forma_pagamento ?? null,
      data_venda: nullify(d.data_venda),
      funil_id: d.funil_id ?? null,
      sdr_id: d.sdr_id ?? null,
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
      metadata: { lead_id: params.id, card_id: d.card_id ?? null },
    });

    return ok(venda, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/leads/[id]/vendas");
  }
}
