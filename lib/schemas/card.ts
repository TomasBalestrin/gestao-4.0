import { z } from "zod";

import { createLeadSchema } from "@/lib/schemas/lead";

// custom_fields é validado dinamicamente pelo schema do funil (custom-fields.ts).
// Aqui aceitamos um record genérico; a validação fina acontece no route handler.
const customFieldsRecord = z.record(z.string(), z.unknown());

export const createCardSchema = z
  .object({
    funil_id: z.string().uuid(),
    etapa_id: z.string().uuid().optional(), // default: 1ª etapa do funil (server decide)
    assigned_to: z.string().uuid().optional().nullable(),
    custom_fields: customFieldsRecord.default({}),
    // Lead: existente (lead_id) OU novo (lead).
    lead_id: z.string().uuid().optional(),
    lead: createLeadSchema.optional(),
  })
  .refine((v) => !!v.lead_id || !!v.lead, {
    message: "Informe um lead existente ou os dados de um novo lead",
    path: ["lead_id"],
  });
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = z.object({
  assigned_to: z.string().uuid().optional().nullable(),
  custom_fields: customFieldsRecord.optional(),
  ordem_na_etapa: z.number().int().nonnegative().optional(),
});
export type UpdateCardInput = z.infer<typeof updateCardSchema>;

// POST /api/cards/[id]/move
export const moveCardSchema = z.object({
  etapa_id: z.string().uuid(),
  ordem_na_etapa: z.number().int().nonnegative().optional(),
});
export type MoveCardInput = z.infer<typeof moveCardSchema>;
