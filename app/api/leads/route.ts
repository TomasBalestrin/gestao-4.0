import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth, requireCrmWrite } from "@/server/auth";
import { createLeadSchema } from "@/lib/schemas/lead";
import {
  FUNIL_ORIGEM_OPTIONS,
  PRODUTO_OFERTADO_OPTIONS,
} from "@/lib/constants/lead-options";
import { logEvent } from "@/lib/audit/logger";
import type { Database } from "@/lib/database.types";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

const listLeadsSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  funil_origem: z.enum(FUNIL_ORIGEM_OPTIONS).optional(),
  sdr_id: z.string().uuid().optional(),
  produto_ofertado: z.enum(PRODUTO_OFERTADO_OPTIONS).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function nullify<T extends string | null | undefined>(value: T): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireAuth();

    const sp = req.nextUrl.searchParams;
    const parsed = listLeadsSchema.safeParse({
      q: sp.get("q") ?? undefined,
      funil_origem: sp.get("funil_origem") ?? undefined,
      sdr_id: sp.get("sdr_id") ?? undefined,
      produto_ofertado: sp.get("produto_ofertado") ?? undefined,
      limit: sp.get("limit") ?? undefined,
      offset: sp.get("offset") ?? undefined,
    });
    if (!parsed.success) return badRequest(parsed.error);

    const { q, funil_origem, sdr_id, produto_ofertado, limit, offset } =
      parsed.data;

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      const like = `%${q}%`;
      query = query.or(
        `nome.ilike.${like},email.ilike.${like},telefone.ilike.${like}`
      );
    }
    if (funil_origem) query = query.eq("funil_origem", funil_origem);
    if (sdr_id) query = query.eq("sdr_id", sdr_id);
    if (produto_ofertado) query = query.eq("produto_ofertado", produto_ofertado);

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/leads]", error);
      throw new ApiError("INTERNAL", "Falha ao listar leads");
    }
    return ok({ items: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    return handleApiError(err, "GET /api/leads");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireCrmWrite();

    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const payload: LeadInsert = {
      nome: parsed.data.nome,
      telefone: nullify(parsed.data.telefone),
      email: nullify(parsed.data.email),
      instagram: nullify(parsed.data.instagram),
      empresa: nullify(parsed.data.empresa),
      nicho: nullify(parsed.data.nicho),
      faturamento_mensal: parsed.data.faturamento_mensal ?? null,
      tem_socio: parsed.data.tem_socio ?? null,
      funil_origem: parsed.data.funil_origem ?? null,
      sdr_id: parsed.data.sdr_id ?? null,
      produto_ofertado: parsed.data.produto_ofertado ?? null,
      dor_principal: parsed.data.dor_principal ?? null,
      observacoes: parsed.data.observacoes ?? null,
      created_by: user.id,
    };

    const { data: lead, error } = await supabase
      .from("leads")
      .insert(payload)
      .select()
      .single();
    if (error || !lead) {
      console.error("[POST /api/leads]", error);
      throw new ApiError("INTERNAL", "Falha ao criar lead");
    }

    await logEvent({
      entityType: "lead",
      entityId: lead.id,
      eventType: "lead_created",
      userId: user.id,
      after: lead,
    });

    return ok(lead, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/leads");
  }
}
