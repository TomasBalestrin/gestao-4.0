import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

interface CopyArgs {
  // Cliente do user (para LEITURA do funil de origem com RLS aplicada).
  supabase: SupabaseClient<Database>;
  cardId: string;
  etapaDestinoId: string;
  userId: string;
}

interface CopyResult {
  copied: boolean;
  newCardId?: string;
  reason?: string;
}

// Quando um card e movido para a `etapa_envio_financeiro_id` configurada
// no seu funil de origem, criamos uma COPIA do card no `funil_financeiro_id`
// (na primeira etapa dele por ordem). O card original permanece no funil
// de origem. Idempotente: se ja existir card-copia para o mesmo lead no
// funil financeiro, nao recria.
export async function copyCardToFinanceiro({
  supabase,
  cardId,
  etapaDestinoId,
  userId,
}: CopyArgs): Promise<CopyResult> {
  const { data: card } = await supabase
    .from("cards")
    .select("id, lead_id, funil_id")
    .eq("id", cardId)
    .maybeSingle();
  if (!card) return { copied: false, reason: "card_not_found" };

  const { data: funil } = await supabase
    .from("funis")
    .select("id, funil_financeiro_id, etapa_envio_financeiro_id")
    .eq("id", card.funil_id)
    .maybeSingle();
  if (!funil) return { copied: false, reason: "funil_not_found" };
  if (!funil.funil_financeiro_id || !funil.etapa_envio_financeiro_id) {
    return { copied: false, reason: "not_configured" };
  }
  if (funil.etapa_envio_financeiro_id !== etapaDestinoId) {
    return { copied: false, reason: "etapa_nao_e_gatilho" };
  }

  // Admin client: o usuario que move o card pode nao ter INSERT no funil
  // financeiro (RLS bloqueia). A copia e iniciativa do sistema.
  const admin = createAdminClient();

  // Idempotencia: se ja existe card ativo do mesmo lead no funil financeiro,
  // nao duplica. Closer pode mover varias vezes pra etapa gatilho sem gerar
  // copias multiplas.
  const { data: existing } = await admin
    .from("cards")
    .select("id")
    .eq("lead_id", card.lead_id)
    .eq("funil_id", funil.funil_financeiro_id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return { copied: false, newCardId: existing.id, reason: "ja_existe" };
  }

  // Primeira etapa do funil financeiro (menor `ordem`).
  const { data: primeiraEtapa } = await admin
    .from("etapas")
    .select("id")
    .eq("funil_id", funil.funil_financeiro_id)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!primeiraEtapa) {
    return { copied: false, reason: "funil_financeiro_sem_etapa" };
  }

  const { data: nova, error } = await admin
    .from("cards")
    .insert({
      lead_id: card.lead_id,
      funil_id: funil.funil_financeiro_id,
      etapa_id: primeiraEtapa.id,
      created_by: userId,
      ordem_na_etapa: 0,
    })
    .select("id")
    .single();

  if (error || !nova) {
    console.error("[copyCardToFinanceiro] insert", error);
    return { copied: false, reason: "insert_failed" };
  }

  return { copied: true, newCardId: nova.id };
}
