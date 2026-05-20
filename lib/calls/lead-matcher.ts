import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

// Normaliza nome: lowercase, sem acento, espacos colapsados, trim.
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchResult {
  lead_id: string | null;
  candidates_count: number;
  reason: "matched" | "no_match" | "multiple_matches" | "empty_name";
}

// Tenta vincular um nome de cliente extraido pela AI a um lead do closer.
// Estrategia:
// 1. Normaliza nome.
// 2. Busca leads cujo nome normalizado contem o nome completo (igualdade ou
//    super-string), filtrados pelo closer (criou OU foi assigned no card).
// 3. Se exatamente 1 candidato -> match. 0 ou multiplos -> unmatched.
export async function matchLeadByClientName(args: {
  supabaseAdmin: SupabaseClient<Database>;
  closerId: string;
  clientName: string | null;
}): Promise<MatchResult> {
  if (!args.clientName || args.clientName.trim().length === 0) {
    return { lead_id: null, candidates_count: 0, reason: "empty_name" };
  }

  const target = normalizeName(args.clientName);
  if (target.length === 0) {
    return { lead_id: null, candidates_count: 0, reason: "empty_name" };
  }

  // Conjunto 1: leads que o closer criou.
  const createdRes = await args.supabaseAdmin
    .from("leads")
    .select("id, nome")
    .eq("created_by", args.closerId)
    .is("deleted_at", null);

  // Conjunto 2: leads em cards assigned ao closer.
  const assignedRes = await args.supabaseAdmin
    .from("cards")
    .select("lead_id, lead:leads(id, nome, deleted_at)")
    .eq("assigned_to", args.closerId)
    .is("deleted_at", null);

  if (createdRes.error) {
    throw new Error(`lead-matcher leads query: ${createdRes.error.message}`);
  }
  if (assignedRes.error) {
    throw new Error(`lead-matcher cards query: ${assignedRes.error.message}`);
  }

  // Indexa leads unicos por id.
  const leadsMap = new Map<string, { id: string; nome: string }>();
  for (const l of createdRes.data ?? []) {
    if (l.id && l.nome) leadsMap.set(l.id, { id: l.id, nome: l.nome });
  }
  for (const c of assignedRes.data ?? []) {
    const lead = c.lead as { id?: string; nome?: string; deleted_at?: string | null } | null;
    if (lead?.id && lead.nome && !lead.deleted_at) {
      leadsMap.set(lead.id, { id: lead.id, nome: lead.nome });
    }
  }

  // Compara normalizado: match se nome do lead contem nome target OU vice-versa.
  // Ex: target "joao silva" bate com lead "Joao Silva Santos" e vice-versa.
  const candidates: { id: string; nome: string }[] = [];
  for (const lead of leadsMap.values()) {
    const normalized = normalizeName(lead.nome);
    if (normalized === target) {
      // Match exato tem prioridade absoluta.
      return { lead_id: lead.id, candidates_count: 1, reason: "matched" };
    }
    if (normalized.includes(target) || target.includes(normalized)) {
      candidates.push(lead);
    }
  }

  if (candidates.length === 1) {
    const matched = candidates[0]!;
    return { lead_id: matched.id, candidates_count: 1, reason: "matched" };
  }
  if (candidates.length === 0) {
    return { lead_id: null, candidates_count: 0, reason: "no_match" };
  }
  return {
    lead_id: null,
    candidates_count: candidates.length,
    reason: "multiple_matches",
  };
}
