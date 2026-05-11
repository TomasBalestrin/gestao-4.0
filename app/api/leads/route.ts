import { NextRequest } from "next/server";

import { requireAuth } from "@/server/auth";
import { createLeadSchema, leadSearchSchema } from "@/lib/schemas/lead";
import { logEvent } from "@/lib/audit/logger";
import { ApiError, badRequest, handleApiError, ok } from "@/server/api-helpers";

function nullify(value: string | null | undefined): string | null {
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
    const { user, supabase } = await requireAuth();

    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        nome: parsed.data.nome,
        email: nullify(parsed.data.email),
        telefone: nullify(parsed.data.telefone),
        origem: parsed.data.origem ?? "manual",
        observacoes: parsed.data.observacoes ?? null,
        created_by: user.id,
      })
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
