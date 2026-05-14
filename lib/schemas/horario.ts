import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";

export const diasSemana = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export const diaSemanaSchema = z.enum(diasSemana);
export type DiaSemanaValue = z.infer<typeof diaSemanaSchema>;

export const SLOT_DURATIONS = [5, 10, 15, 20, 30, 45, 60] as const;
export const BUFFERS = [0, 5, 10, 15] as const;

// "24:00" é aceito apenas como boundary de fim de dia.
const hhmm = z
  .string()
  .regex(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/, "Use o formato HH:mm");

export const blocoSchema = z
  .object({
    inicio: hhmm,
    fim: hhmm,
  })
  .refine((b) => b.inicio < b.fim, {
    message: "Início deve ser antes do fim",
    path: ["fim"],
  });
export type Bloco = z.infer<typeof blocoSchema>;

function blocosOverlap(blocos: Bloco[]): boolean {
  const sorted = [...blocos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.inicio < sorted[i - 1]!.fim) return true;
  }
  return false;
}

export const closerHorarioSchema = z
  .object({
    closer_id: uuidSchema,
    dia_semana: diaSemanaSchema,
    blocos: z.array(blocoSchema).default([]),
    slot_duration_min: z
      .number()
      .int()
      .refine((n) => (SLOT_DURATIONS as readonly number[]).includes(n), {
        message: "Duração de slot inválida",
      })
      .default(30),
    buffer_min: z
      .number()
      .int()
      .refine((n) => (BUFFERS as readonly number[]).includes(n), {
        message: "Buffer inválido",
      })
      .default(10),
    ativo: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (blocosOverlap(v.blocos)) {
      ctx.addIssue({
        code: "custom",
        message: "Blocos não podem se sobrepor no mesmo dia",
        path: ["blocos"],
      });
    }
  });
export type CloserHorarioInput = z.infer<typeof closerHorarioSchema>;

// Atualização de um dia (sem closer_id/dia_semana, vêm da rota).
export const updateCloserHorarioSchema = z
  .object({
    blocos: z.array(blocoSchema),
    slot_duration_min: z
      .number()
      .int()
      .refine((n) => (SLOT_DURATIONS as readonly number[]).includes(n)),
    buffer_min: z
      .number()
      .int()
      .refine((n) => (BUFFERS as readonly number[]).includes(n)),
    ativo: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (blocosOverlap(v.blocos)) {
      ctx.addIssue({
        code: "custom",
        message: "Blocos não podem se sobrepor no mesmo dia",
        path: ["blocos"],
      });
    }
  });
export type UpdateCloserHorarioInput = z.infer<
  typeof updateCloserHorarioSchema
>;

// Um dia na payload de substituição completa (PUT). closer_id vem da rota.
export const closerHorarioDaySchema = z
  .object({
    dia_semana: diaSemanaSchema,
    blocos: z.array(blocoSchema),
    slot_duration_min: z
      .number()
      .int()
      .refine((n) => (SLOT_DURATIONS as readonly number[]).includes(n), {
        message: "Duração de slot inválida",
      }),
    buffer_min: z
      .number()
      .int()
      .refine((n) => (BUFFERS as readonly number[]).includes(n), {
        message: "Buffer inválido",
      }),
    ativo: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (blocosOverlap(v.blocos)) {
      ctx.addIssue({
        code: "custom",
        message: "Blocos não podem se sobrepor no mesmo dia",
        path: ["blocos"],
      });
    }
  });
export type CloserHorarioDay = z.infer<typeof closerHorarioDaySchema>;

// PUT substitui toda a configuração do closer.
export const replaceCloserHorariosSchema = z.object({
  dias: z.array(closerHorarioDaySchema).max(7),
});
export type ReplaceCloserHorariosInput = z.infer<
  typeof replaceCloserHorariosSchema
>;

// Template inicial (PRD F-04): seg–sex 09:00–12:00 / 14:00–18:00, slots 30min, buffer 10min.
export const DEFAULT_HORARIO_TEMPLATE: CloserHorarioDay[] = (
  ["monday", "tuesday", "wednesday", "thursday", "friday"] as const
).map((dia) => ({
  dia_semana: dia,
  blocos: [
    { inicio: "09:00", fim: "12:00" },
    { inicio: "14:00", fim: "18:00" },
  ],
  slot_duration_min: 30,
  buffer_min: 10,
  ativo: true,
}));
