import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";
import {
  FUNIL_ORIGEM_OPTIONS,
  PRODUTO_OFERTADO_OPTIONS,
} from "@/lib/constants/lead-options";

const optionalString = (max: number) =>
  z.string().max(max).optional().nullable().or(z.literal(""));

export const funilOrigemSchema = z.enum(FUNIL_ORIGEM_OPTIONS);
export const produtoOfertadoSchema = z.enum(PRODUTO_OFERTADO_OPTIONS);

export const leadBaseSchema = z.object({
  // Contato
  nome: z.string().min(1, "Nome obrigatório").max(120),
  telefone: optionalString(20),
  email: z
    .string()
    .email("Email inválido")
    .max(180)
    .optional()
    .nullable()
    .or(z.literal("")),
  instagram: optionalString(60),

  // Negócio
  empresa: optionalString(120),
  nicho: optionalString(120),
  faturamento_mensal: z
    .number()
    .nonnegative("Faturamento inválido")
    .max(1_000_000_000_000)
    .optional()
    .nullable(),
  tem_socio: z.boolean().optional().nullable(),
  funil_origem: funilOrigemSchema.optional().nullable(),
  sdr_id: uuidSchema.optional().nullable(),
  produto_ofertado: produtoOfertadoSchema.optional().nullable(),

  // Adicionais
  dor_principal: z.string().max(2000).optional().nullable(),
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
