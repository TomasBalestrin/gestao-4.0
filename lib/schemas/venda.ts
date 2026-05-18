import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";
import { PRODUTO_OFERTADO_OPTIONS } from "@/lib/constants/lead-options";
import { ESTADO_CIVIL_OPTIONS } from "@/lib/constants/estado-civil";

const optionalString = (max: number) =>
  z.string().max(max).optional().nullable().or(z.literal(""));

const optionalDate = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), {
    message: "Data inválida",
  })
  .optional()
  .nullable()
  .or(z.literal(""));

export const createVendaSchema = z.object({
  card_id: uuidSchema.optional().nullable(),

  // Produto / contrato
  produto: z.enum(PRODUTO_OFERTADO_OPTIONS).optional().nullable(),
  valor: z
    .number()
    .nonnegative("Valor inválido")
    .max(1_000_000_000_000, "Valor muito alto"),
  forma_pagamento: z.string().max(2000).optional().nullable(),
  vigencia: optionalString(120),
  data_venda: optionalDate,

  // Identificacao
  nome_completo: z
    .string()
    .min(1, "Nome completo obrigatório")
    .max(180),
  nacionalidade: optionalString(60),
  estado_civil: z.enum(ESTADO_CIVIL_OPTIONS).optional().nullable(),
  cpf: optionalString(20),
  rg: optionalString(30),
  cnpj: optionalString(20),
  data_nascimento: optionalDate,

  // Endereco
  endereco: optionalString(240),
  bairro: optionalString(120),
  cidade: optionalString(120),
  cep: optionalString(12),

  // Contato
  instagram: optionalString(60),
  email: z
    .string()
    .email("Email inválido")
    .max(180)
    .optional()
    .nullable()
    .or(z.literal("")),
  whatsapp: optionalString(30),

  // Relacionamentos
  funil_id: uuidSchema.optional().nullable(),
  sdr_id: uuidSchema.optional().nullable(),
});
export type CreateVendaInput = z.infer<typeof createVendaSchema>;

export const updateVendaSchema = createVendaSchema.partial();
export type UpdateVendaInput = z.infer<typeof updateVendaSchema>;
