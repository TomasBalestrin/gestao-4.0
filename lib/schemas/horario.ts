import { z } from "zod";

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

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:mm");

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
    closer_id: z.string().uuid(),
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
