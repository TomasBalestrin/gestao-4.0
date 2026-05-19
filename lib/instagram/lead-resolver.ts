import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface IgInboundLeadInput {
  funilId: string;
  igInstanceId: string;
  senderPsid: string;
  senderUsername?: string | null;
  senderName?: string | null;
  igUserIdOfInstance: string;
}

export interface IgInboundLeadResult {
  leadId: string;
  cardId: string;
  threadId: string;
}

// Resolve thread + lead + card pra uma mensagem inbound do IG.
// 1) Se ja existe thread (ig_instance_id + sender_psid), reusa.
// 2) Senao, cria lead novo (sem telefone) + card na primeira etapa do funil
//    + thread.
export async function getOrCreateIgInboundChain(
  admin: AdminClient,
  input: IgInboundLeadInput
): Promise<IgInboundLeadResult | null> {
  // 1. Thread existente?
  const { data: existing } = await admin
    .from("ig_threads")
    .select("id, lead_id")
    .eq("ig_instance_id", input.igInstanceId)
    .eq("ig_sender_psid", input.senderPsid)
    .maybeSingle();

  if (existing) {
    const { data: card } = await admin
      .from("cards")
      .select("id")
      .eq("lead_id", existing.lead_id)
      .eq("funil_id", input.funilId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (card) {
      return {
        leadId: existing.lead_id,
        cardId: card.id,
        threadId: existing.id,
      };
    }
    // Thread existe mas card foi deletado. Cria card novo.
  }

  // 2. Primeira etapa do funil (menor `ordem`).
  const { data: primeiraEtapa } = await admin
    .from("etapas")
    .select("id")
    .eq("funil_id", input.funilId)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!primeiraEtapa) {
    console.warn(
      "[ig/lead-resolver] funil sem etapa, dropando inbound:",
      input.funilId
    );
    return null;
  }

  // 3. Cria lead + card + thread numa cadeia.
  let leadId: string;
  if (existing) {
    leadId = existing.lead_id;
  } else {
    const nome =
      input.senderName?.trim() ||
      (input.senderUsername ? `@${input.senderUsername}` : "Lead Instagram");
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .insert({
        nome,
        instagram: input.senderUsername ?? null,
        funil_origem: "Instagram",
      })
      .select("id")
      .single();
    if (leadErr || !lead) {
      console.error("[ig/lead-resolver] falha criando lead", leadErr);
      return null;
    }
    leadId = lead.id;
  }

  const { data: card, error: cardErr } = await admin
    .from("cards")
    .insert({
      lead_id: leadId,
      funil_id: input.funilId,
      etapa_id: primeiraEtapa.id,
      ordem_na_etapa: 0,
    })
    .select("id")
    .single();
  if (cardErr || !card) {
    console.error("[ig/lead-resolver] falha criando card", cardErr);
    return null;
  }

  let threadId: string;
  if (existing) {
    threadId = existing.id;
  } else {
    const { data: thread, error: threadErr } = await admin
      .from("ig_threads")
      .insert({
        lead_id: leadId,
        ig_instance_id: input.igInstanceId,
        ig_sender_psid: input.senderPsid,
        ig_sender_username: input.senderUsername ?? null,
      })
      .select("id")
      .single();
    if (threadErr || !thread) {
      console.error("[ig/lead-resolver] falha criando thread", threadErr);
      return null;
    }
    threadId = thread.id;
  }

  return { leadId, cardId: card.id, threadId };
}
