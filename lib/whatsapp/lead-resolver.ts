import type { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit/logger";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface InboundLeadInput {
  phone: string; // dígitos puros, sem +
  pushName?: string | null;
  instanceUserId: string; // dono da instância que recebeu
}

export interface InboundLeadResult {
  leadId: string;
  cardId: string;
  funilId: string;
}

// Resolve o lead/card de uma mensagem inbound. Estratégia:
//  1) tenta achar lead existente do mesmo user pelo telefone (não deletado);
//     se tem card vivo, reusa lead+card sem criar nada.
//  2) se achou lead mas todos os cards estão deletados, cria card novo no
//     funil inbound default (mantém o lead).
//  3) se não achou lead, cria lead + card novos no funil inbound default.
// Os passos 2 e 3 precisam do inbound_default_funil_id configurado.
// Retorna null quando precisa do default e ele não está setado.
export async function createInboundLeadAndCard(
  admin: AdminClient,
  input: InboundLeadInput
): Promise<InboundLeadResult | null> {
  // 1. Lead existente do mesmo user com mesmo telefone?
  const { data: existingLead } = await admin
    .from("leads")
    .select("id")
    .eq("telefone", input.phone)
    .eq("created_by", input.instanceUserId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingLead) {
    const { data: existingCard } = await admin
      .from("cards")
      .select("id, funil_id")
      .eq("lead_id", existingLead.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingCard) {
      return {
        leadId: existingLead.id,
        cardId: existingCard.id,
        funilId: existingCard.funil_id,
      };
    }
    // lead órfão (sem cards vivos): cai pro fluxo do funil inbound default
    // para criar um card novo mantendo o lead.
  }

  // 2. Resolver funil inbound default.
  const { data: config } = await admin
    .from("configuracoes_globais")
    .select("value")
    .eq("key", "inbound_default_funil_id")
    .maybeSingle();

  const funilId =
    typeof config?.value === "string"
      ? config.value
      : config?.value && typeof config.value === "object"
        ? null
        : null;

  if (!funilId) {
    console.warn(
      "[wa/lead-resolver] inbound_default_funil_id não configurado — dropando inbound"
    );
    return null;
  }

  // 3. Pegar primeira etapa do funil (ordem ASC).
  const { data: etapa, error: etapaErr } = await admin
    .from("etapas")
    .select("id")
    .eq("funil_id", funilId)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (etapaErr || !etapa) {
    console.error(
      "[wa/lead-resolver] funil inbound sem etapa configurada",
      etapaErr
    );
    return null;
  }

  // 4. Criar lead (se ainda não existir) ou reusar o existente sem card vivo.
  let leadId: string;
  let leadCreated = false;
  if (existingLead) {
    leadId = existingLead.id;
  } else {
    const nome = (input.pushName ?? "").trim() || `Lead ${input.phone}`;
    const { data: newLead, error: leadErr } = await admin
      .from("leads")
      .insert({
        nome,
        telefone: input.phone,
        origem: "wa_inbound",
        created_by: input.instanceUserId,
      })
      .select("id")
      .single();
    if (leadErr || !newLead) {
      console.error("[wa/lead-resolver] falha criando lead", leadErr);
      return null;
    }
    leadId = newLead.id;
    leadCreated = true;
  }

  // 5. Criar card.
  const { data: card, error: cardErr } = await admin
    .from("cards")
    .insert({
      lead_id: leadId,
      funil_id: funilId,
      etapa_id: etapa.id,
      assigned_to: input.instanceUserId,
      created_by: input.instanceUserId,
    })
    .select("id, funil_id")
    .single();
  if (cardErr || !card) {
    console.error("[wa/lead-resolver] falha criando card", cardErr);
    return null;
  }

  if (leadCreated) {
    await logEvent({
      entityType: "lead",
      entityId: leadId,
      eventType: "lead_created",
      userId: input.instanceUserId,
      after: { id: leadId, telefone: input.phone, origem: "wa_inbound" },
      metadata: { source: "whatsapp_inbound" },
    });
  }

  await logEvent({
    entityType: "card",
    entityId: card.id,
    eventType: "card_created",
    userId: input.instanceUserId,
    after: { id: card.id, funil_id: card.funil_id, lead_id: leadId },
    metadata: { source: "whatsapp_inbound" },
  });

  return { leadId, cardId: card.id, funilId: card.funil_id };
}
