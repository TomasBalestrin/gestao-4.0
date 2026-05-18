import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";

import { createLeadSchema } from "@/lib/schemas/lead";

export const createCardSchema = z
  .object({
    funil_id: uuidSchema,
    etapa_id: uuidSchema.optional(), // default: 1ª etapa do funil (server decide)
    assigned_to: uuidSchema.optional().nullable(),
    // Lead: existente (lead_id) OU novo (lead).
    lead_id: uuidSchema.optional(),
    lead: createLeadSchema.optional(),
  })
  .refine((v) => !!v.lead_id || !!v.lead, {
    message: "Informe um lead existente ou os dados de um novo lead",
    path: ["lead_id"],
  });
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = z.object({
  assigned_to: uuidSchema.optional().nullable(),
  ordem_na_etapa: z.number().int().nonnegative().optional(),
});
export type UpdateCardInput = z.infer<typeof updateCardSchema>;

// POST /api/cards/[id]/move
export const moveCardSchema = z.object({
  etapa_id: uuidSchema,
  ordem_na_etapa: z.number().int().nonnegative().optional(),
});
export type MoveCardInput = z.infer<typeof moveCardSchema>;
