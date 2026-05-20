import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/common";

export const callAnalysisStatuses = [
  "pending",
  "processing",
  "unmatched",
  "matched",
  "failed",
] as const;

export const callAnalysisStatusSchema = z.enum(callAnalysisStatuses);
export type CallAnalysisStatusValue = z.infer<typeof callAnalysisStatusSchema>;

// Query params da listagem.
export const callAnalysisListQuerySchema = z.object({
  status: callAnalysisStatusSchema.optional(),
  closer_id: uuidSchema.optional(),
  lead_id: uuidSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type CallAnalysisListQuery = z.infer<typeof callAnalysisListQuerySchema>;

// Vincula uma analise unmatched a um lead.
export const linkCallAnalysisToLeadSchema = z.object({
  lead_id: uuidSchema,
});

export type LinkCallAnalysisToLeadInput = z.infer<
  typeof linkCallAnalysisToLeadSchema
>;
