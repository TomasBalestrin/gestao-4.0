import { NextRequest } from "next/server";

import { requireAuth, requireCrmWrite } from "@/server/auth";
import { createCardSchema } from "@/lib/schemas/card";
import {
  buildCustomFieldsSchema,
  customFieldsSchemaSchema,
} from "@/lib/schemas/custom-fields";
import { logEvent } from "@/lib/audit/logger";
import type { Json } from "@/lib/database.types";
import {
  ApiError,
  badRequest,
  errorResponse,
  handleApiError,
  notFound,
  ok,
} from "@/server/api-helpers";

interface RouteParams {
  params: { id: string };
}

function nullify(value: string | null | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("cards")
      .select(
        "*, lead:leads(*), etapa:etapas(id, nome, cor, ordem), assigned:users!cards_assigned_to_fkey(id, nome, foto_url), automation_errors(id, resolved_at)"
      )
      .eq("funil_id", params.id)
      .is("deleted_at", null)
      .order("ordem_na_etapa", { ascending: true });
    if (error) {
      console.error("[GET /api/funis/[id]/cards]", error);
      throw new ApiError("INTERNAL", "Falha ao listar cards");
    }
    return ok(data ?? []);
  } catch (err) {
    return handleApiError(err, "GET /api/funis/[id]/cards");
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile, supabase } = await requireCrmWrite();

    const body = await req.json();
    const parsed = createCardSchema.safeParse({ ...body, funil_id: params.id });
    if (!parsed.success) return badRequest(parsed.error);

    const { data: funil } = await supabase
      .from("funis")
      .select("id, custom_fields_schema, etapas!funil_id(id, ordem)")
      .eq("id", params.id)
      .maybeSingle();
    if (!funil) return notFound("Funil não encontrado");

    // A RLS de cards exige que o usuário seja membro do funil (user_funis).
    // Admins veem todos os funis mas podem não estar vinculados — vincula aqui.
    if (profile.role === "admin") {
      await supabase
        .from("user_funis")
        .upsert(
          { user_id: user.id, funil_id: params.id },
          { onConflict: "user_id,funil_id", ignoreDuplicates: true }
        );
    }

    const etapas = Array.isArray(funil.etapas)
      ? [...funil.etapas].sort((a, b) => a.ordem - b.ordem)
      : [];
    if (etapas.length === 0) {
      return errorResponse("BUSINESS_RULE", "Funil não possui etapas");
    }

    if (
      parsed.data.etapa_id &&
      !etapas.some((e) => e.id === parsed.data.etapa_id)
    ) {
      return badRequest("Etapa não pertence a este funil");
    }
    const etapaId = parsed.data.etapa_id ?? etapas[0]!.id;

    // Valida custom_fields contra o schema dinâmico do funil.
    const cfConfigParsed = customFieldsSchemaSchema.safeParse(
      funil.custom_fields_schema
    );
    const cfConfig = cfConfigParsed.success ? cfConfigParsed.data : [];
    const cfValidation = buildCustomFieldsSchema(cfConfig).safeParse(
      parsed.data.custom_fields ?? {}
    );
    if (!cfValidation.success) {
      return errorResponse(
        "VALIDATION",
        "Campos customizados inválidos",
        cfValidation.error.flatten()
      );
    }

    // Resolve o lead (existente ou novo).
    let leadId = parsed.data.lead_id ?? null;
    let createdLead: { id: string } | null = null;
    if (!leadId && parsed.data.lead) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          nome: parsed.data.lead.nome,
          email: nullify(parsed.data.lead.email),
          telefone: nullify(parsed.data.lead.telefone),
          origem: parsed.data.lead.origem ?? "manual",
          observacoes: parsed.data.lead.observacoes ?? null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (leadError || !lead) {
        console.error("[POST cards] create lead", leadError);
        throw new ApiError("INTERNAL", "Falha ao criar lead");
      }
      leadId = lead.id;
      createdLead = lead;
    }
    if (!leadId) return badRequest("Informe um lead");

    const { data: lastCard } = await supabase
      .from("cards")
      .select("ordem_na_etapa")
      .eq("etapa_id", etapaId)
      .is("deleted_at", null)
      .order("ordem_na_etapa", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrdem = (lastCard?.ordem_na_etapa ?? -1) + 1;

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .insert({
        lead_id: leadId,
        funil_id: params.id,
        etapa_id: etapaId,
        assigned_to: parsed.data.assigned_to ?? user.id,
        created_by: user.id,
        custom_fields: cfValidation.data as Json,
        ordem_na_etapa: nextOrdem,
      })
      .select(
        "*, lead:leads(*), etapa:etapas(id, nome, cor, ordem), assigned:users!cards_assigned_to_fkey(id, nome, foto_url)"
      )
      .single();
    if (cardError || !card) {
      console.error("[POST cards] create card", cardError);
      // Evita lead órfão se acabamos de criá-lo e o card falhou.
      if (createdLead) {
        await supabase.from("leads").delete().eq("id", createdLead.id);
      }
      throw new ApiError("INTERNAL", "Falha ao criar card");
    }

    if (createdLead) {
      await logEvent({
        entityType: "lead",
        entityId: createdLead.id,
        eventType: "lead_created",
        userId: user.id,
        metadata: { via: "card" },
      });
    }
    await logEvent({
      entityType: "card",
      entityId: card.id,
      eventType: "card_created",
      userId: user.id,
      after: { id: card.id, funil_id: params.id, etapa_id: etapaId },
      metadata: { funil_id: params.id },
    });

    return ok(card, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/funis/[id]/cards");
  }
}
