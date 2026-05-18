import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";

export const createVendaSchema = z.object({
  card_id: uuidSchema.optional().nullable(),
  valor_venda: z
    .number()
    .nonnegative("Valor inválido")
    .max(1_000_000_000_000, "Valor muito alto"),
  valor_entrada: z
    .number()
    .nonnegative("Valor de entrada inválido")
    .max(1_000_000_000_000)
    .optional()
    .nullable(),
  vigencia_contrato: z
    .string()
    .max(120, "Vigência muito longa")
    .optional()
    .nullable(),
  negociacao: z.string().max(2000).optional().nullable(),
  notas: z.string().max(2000).optional().nullable(),
});
export type CreateVendaInput = z.infer<typeof createVendaSchema>;

export const updateVendaSchema = createVendaSchema.partial();
export type UpdateVendaInput = z.infer<typeof updateVendaSchema>;
