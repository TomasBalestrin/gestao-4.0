import { z } from "zod";

export const leadBaseSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(120),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  telefone: z.string().min(8, "Telefone inválido").max(20).optional().nullable().or(z.literal("")),
  origem: z.string().max(60).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
});

export const createLeadSchema = leadBaseSchema;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = leadBaseSchema.partial();
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const leadSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
});
export type LeadSearchInput = z.infer<typeof leadSearchSchema>;
