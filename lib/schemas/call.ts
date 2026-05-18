import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";

export const callStatuses = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;
export const callStatusSchema = z.enum(callStatuses);
export type CallStatusValue = z.infer<typeof callStatusSchema>;

const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Data/hora inválida" });

export const scheduleCallSchema = z
  .object({
    card_id: uuidSchema,
    closer_id: uuidSchema,
    slot_start: isoDateTime,
    slot_end: isoDateTime,
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => Date.parse(v.slot_start) < Date.parse(v.slot_end), {
    message: "Início do slot deve ser antes do fim",
    path: ["slot_end"],
  })
  .refine((v) => Date.parse(v.slot_start) > Date.now(), {
    message: "Não é possível agendar no passado",
    path: ["slot_start"],
  });
export type ScheduleCallInput = z.infer<typeof scheduleCallSchema>;

export const cancelCallSchema = z.object({
  motivo: z.string().max(500).optional().nullable(),
});
export type CancelCallInput = z.infer<typeof cancelCallSchema>;

// PATCH presença: completed | no_show
export const callAttendanceSchema = z.object({
  status: z.enum(["completed", "no_show"]),
});
export type CallAttendanceInput = z.infer<typeof callAttendanceSchema>;

// GET /api/closer-horarios/[userId]/slots?date=YYYY-MM-DD
export const availableSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;
