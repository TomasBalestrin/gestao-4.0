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

// Cria SEMPRE um lead novo + card no funil inbound default.
// Regra: estilo WhatsApp pessoal — cada user tem o próprio lead, sem reuso entre users.
// Retorna null se inbound_default_funil_id não estiver configurado (handler dropa msg).
export async function createInboundLeadAndCard(
  admin: AdminClient,
  input: InboundLeadInput
): Promise<InboundLeadResult | null> {
  // 1. Resolver funil inbound default.
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

  // 2. Pegar primeira etapa do funil (ordem ASC).
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

  const nome = (input.pushName ?? "").trim() || `Lead ${input.phone}`;

  // 3. Criar lead.
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      nome,
      telefone: input.phone,
      origem: "wa_inbound",
      created_by: input.instanceUserId,
    })
    .select("id")
    .single();
  if (leadErr || !lead) {
    console.error("[wa/lead-resolver] falha criando lead", leadErr);
    return null;
  }

  // 4. Criar card.
  const { data: card, error: cardErr } = await admin
    .from("cards")
    .insert({
      lead_id: lead.id,
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

  await logEvent({
    entityType: "lead",
    entityId: lead.id,
    eventType: "lead_created",
    userId: input.instanceUserId,
    after: { id: lead.id, telefone: input.phone, origem: "wa_inbound" },
    metadata: { source: "whatsapp_inbound" },
  });

  await logEvent({
    entityType: "card",
    entityId: card.id,
    eventType: "card_created",
    userId: input.instanceUserId,
    after: { id: card.id, funil_id: card.funil_id, lead_id: lead.id },
    metadata: { source: "whatsapp_inbound" },
  });

  return { leadId: lead.id, cardId: card.id, funilId: card.funil_id };
}
