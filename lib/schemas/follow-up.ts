import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";

// Data ISO simples (yyyy-mm-dd) — sem hora.
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Data invalida (use yyyy-mm-dd)");

export const createFollowUpSchema = z.object({
  card_id: uuidSchema,
  due_date: dateSchema,
  user_id: uuidSchema.optional(), // default: usuario autenticado
});
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

export const updateFollowUpSchema = z.object({
  due_date: dateSchema.optional(),
  done_at: z.string().datetime().nullable().optional(),
});
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
