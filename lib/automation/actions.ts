import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import {
  duplicateToConfigSchema,
  moveToConfigSchema,
} from "@/lib/schemas/automacao";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface MoveToResult {
  targetEtapaId: string;
  targetFunilId: string;
}

export async function executeMoveTo(
  admin: AdminClient,
  cardId: string,
  rawConfig: unknown
): Promise<MoveToResult> {
  const parsed = moveToConfigSchema.safeParse(rawConfig);
  if (!parsed.success) throw new Error("Config de move_to inválida");
  const { target_etapa_id, target_funil_id } = parsed.data;

  const { error } = await admin
    .from("cards")
    .update({ etapa_id: target_etapa_id, funil_id: target_funil_id })
    .eq("id", cardId)
    .is("deleted_at", null);
  if (error) throw new Error(`move_to falhou: ${error.message}`);

  return { targetEtapaId: target_etapa_id, targetFunilId: target_funil_id };
}

export interface DuplicateToResult {
  created: number;
}

export async function executeDuplicateTo(
  admin: AdminClient,
  sourceCardId: string,
  rawConfig: unknown,
  userId: string
): Promise<DuplicateToResult> {
  const parsed = duplicateToConfigSchema.safeParse(rawConfig);
  if (!parsed.success) throw new Error("Config de duplicate_to inválida");

  const { data: source, error: srcError } = await admin
    .from("cards")
    .select("lead_id, custom_fields, assigned_to")
    .eq("id", sourceCardId)
    .single();
  if (srcError || !source) {
    throw new Error("duplicate_to: card de origem não encontrado");
  }

  let created = 0;
  for (const target of parsed.data.targets) {
    const { data: last } = await admin
      .from("cards")
      .select("ordem_na_etapa")
      .eq("etapa_id", target.etapa_id)
      .is("deleted_at", null)
      .order("ordem_na_etapa", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await admin.from("cards").insert({
      lead_id: source.lead_id,
      funil_id: target.funil_id,
      etapa_id: target.etapa_id,
      assigned_to: source.assigned_to,
      created_by: userId,
      parent_card_id: sourceCardId,
      custom_fields: source.custom_fields as Json,
      ordem_na_etapa: (last?.ordem_na_etapa ?? -1) + 1,
    });
    if (error) throw new Error(`duplicate_to falhou: ${error.message}`);
    created++;
  }

  return { created };
}
