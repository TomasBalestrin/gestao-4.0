import { NextRequest } from "next/server";

import { requireAuth, requireCrmWrite } from "@/server/auth";
import { createLeadSchema, leadSearchSchema } from "@/lib/schemas/lead";
import { logEvent } from "@/lib/audit/logger";
import type { Database } from "@/lib/database.types";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

function nullify<T extends string | null | undefined>(value: T): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireAuth();

    const parsed = leadSearchSchema.safeParse({
      q: req.nextUrl.searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) return badRequest(parsed.error);
    const q = parsed.data.q.trim();

    let query = supabase
      .from("leads")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (q) {
      const like = `%${q}%`;
      query = query.or(
        `nome.ilike.${like},email.ilike.${like},telefone.ilike.${like}`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/leads]", error);
      throw new ApiError("INTERNAL", "Falha ao listar leads");
    }
    return ok(data ?? []);
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
      data_followup: nullify(parsed.data.data_followup),
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
