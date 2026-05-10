import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use hex)");

export const createEtapaSchema = z.object({
  funil_id: z.string().uuid(),
  nome: z.string().min(1, "Nome obrigatório").max(60),
  cor: hexColor.default("#525252"),
  ordem: z.number().int().nonnegative(),
});
export type CreateEtapaInput = z.infer<typeof createEtapaSchema>;

export const updateEtapaSchema = z.object({
  nome: z.string().min(1).max(60).optional(),
  cor: hexColor.optional(),
  ordem: z.number().int().nonnegative().optional(),
});
export type UpdateEtapaInput = z.infer<typeof updateEtapaSchema>;

// Reordenação em lote (PRD F-02: reordenar não dispara automação).
export const reorderEtapasSchema = z.object({
  ordem: z
    .array(z.object({ id: z.string().uuid(), ordem: z.number().int().nonnegative() }))
    .min(1),
});
export type ReorderEtapasInput = z.infer<typeof reorderEtapasSchema>;
