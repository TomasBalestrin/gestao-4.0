import { z } from "zod";

import { userRoleSchema } from "@/lib/schemas/funil";

// Engine: profundidade máxima de cascata move_to (PRD F-06 / architecture §9).
export const MAX_AUTOMATION_DEPTH = 5;
export const AUTOMATION_TIMEOUT_MS = 5_000;

export const automacaoActions = ["move_to", "duplicate_to"] as const;
export const automacaoActionSchema = z.enum(automacaoActions);
export type AutomacaoActionValue = z.infer<typeof automacaoActionSchema>;

const targetSchema = z.object({
  funil_id: z.string().uuid(),
  etapa_id: z.string().uuid(),
});

// config depende da action.
const moveToConfigSchema = z.object({
  target_funil_id: z.string().uuid(),
  target_etapa_id: z.string().uuid(),
});
const duplicateToConfigSchema = z.object({
  targets: z.array(targetSchema).min(1, "Informe ao menos 1 destino"),
});

// Notificações: in_app (target role), whatsapp/instagram (placeholder no MVP).
export const notificacaoSchema = z.object({
  tipo: z.enum(["in_app", "whatsapp", "instagram"]),
  target_role: userRoleSchema.optional(),
  target_user_id: z.string().uuid().optional(),
  mensagem: z.string().max(500).optional(),
});
export type NotificacaoConfig = z.infer<typeof notificacaoSchema>;

export const automacaoSchema = z
  .object({
    etapa_id: z.string().uuid(),
    nome: z.string().min(1, "Nome obrigatório").max(80),
    action: automacaoActionSchema,
    config: z.unknown(),
    notificacoes: z.array(notificacaoSchema).default([]),
    ativo: z.boolean().default(true),
    ordem: z.number().int().nonnegative().default(0),
  })
  .superRefine((v, ctx) => {
    const result =
      v.action === "move_to"
        ? moveToConfigSchema.safeParse(v.config)
        : duplicateToConfigSchema.safeParse(v.config);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: "Config inválida para a ação selecionada",
        path: ["config"],
      });
    }
  });
export type AutomacaoInput = z.infer<typeof automacaoSchema>;

export const updateAutomacaoSchema = z.object({
  nome: z.string().min(1).max(80).optional(),
  notificacoes: z.array(notificacaoSchema).optional(),
  ativo: z.boolean().optional(),
  ordem: z.number().int().nonnegative().optional(),
});
export type UpdateAutomacaoInput = z.infer<typeof updateAutomacaoSchema>;

export { moveToConfigSchema, duplicateToConfigSchema };
export type MoveToConfig = z.infer<typeof moveToConfigSchema>;
export type DuplicateToConfig = z.infer<typeof duplicateToConfigSchema>;
