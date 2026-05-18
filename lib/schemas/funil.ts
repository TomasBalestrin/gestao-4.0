import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";

import { customFieldsSchemaSchema } from "@/lib/schemas/custom-fields";

export const userRoles = [
  "admin",
  "social_selling",
  "closer",
  "sdr",
  "financeiro",
  "lider",
] as const;
export const userRoleSchema = z.enum(userRoles);
export type UserRoleValue = z.infer<typeof userRoleSchema>;

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use hex)");

export const funilBaseSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(80),
  cor: hexColor.default("#A1A1A1"),
  descricao: z.string().max(500).optional().nullable(),
  role_alvo: userRoleSchema,
  custom_fields_schema: customFieldsSchemaSchema.default([]),
  // Agendamento de call: habilita o botão "Agendar call" nos cards deste funil e
  // dispara a migração do card para o funil/etapa configurados quando agendada.
  // Cross-field (origem precisa ser sdr/social_selling, destino precisa ser
  // funil de closer, etapa precisa pertencer ao funil destino) é validado no
  // route handler porque depende de leituras do banco.
  agenda_call_enabled: z.boolean().default(false),
  funil_destino_id: uuidSchema.nullable().optional(),
  etapa_destino_id: uuidSchema.nullable().optional(),
});

// Criação: exige ao menos 1 etapa (PRD F-02).
export const createFunilSchema = funilBaseSchema.extend({
  etapas: z
    .array(
      z.object({
        nome: z.string().min(1, "Nome da etapa obrigatório").max(60),
        cor: hexColor.default("#525252"),
      })
    )
    .min(1, "Funil precisa de ao menos 1 etapa"),
  usuario_ids: z.array(uuidSchema).default([]),
});
export type CreateFunilInput = z.infer<typeof createFunilSchema>;

// PATCH precisa de campos opcionais SEM defaults: campos omitidos no body
// devem virar undefined no parsed.data e não tocar a linha no banco. Reusar
// `funilBaseSchema.partial()` injetaria os defaults do base (cor "#A1A1A1",
// custom_fields_schema [], agenda_call_enabled false), o que zera config
// existente em PATCHs parciais como toggle de Ativo na lista de funis.
export const updateFunilSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(80).optional(),
  cor: hexColor.optional(),
  descricao: z.string().max(500).optional().nullable(),
  role_alvo: userRoleSchema.optional(),
  custom_fields_schema: customFieldsSchemaSchema.optional(),
  is_archived: z.boolean().optional(),
  agenda_call_enabled: z.boolean().optional(),
  funil_destino_id: uuidSchema.nullable().optional(),
  etapa_destino_id: uuidSchema.nullable().optional(),
});
export type UpdateFunilInput = z.infer<typeof updateFunilSchema>;
