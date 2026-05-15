import { z } from "zod";

const envSchema = z.object({
  NEXTAPPS_BASE_URL: z.string().url("NEXTAPPS_BASE_URL deve ser uma URL válida"),
  NEXTAPPS_EMAIL: z.string().email("NEXTAPPS_EMAIL inválido"),
  NEXTAPPS_PASSWORD: z.string().min(1, "NEXTAPPS_PASSWORD obrigatório"),
  NEXTAPPS_MEDIA_MAX_BYTES: z.coerce.number().int().positive().default(16777216),
});

export type WhatsAppEnv = z.infer<typeof envSchema>;

let cached: WhatsAppEnv | null = null;

export function getWhatsAppEnv(): WhatsAppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    NEXTAPPS_BASE_URL: process.env.NEXTAPPS_BASE_URL,
    NEXTAPPS_EMAIL: process.env.NEXTAPPS_EMAIL,
    NEXTAPPS_PASSWORD: process.env.NEXTAPPS_PASSWORD,
    NEXTAPPS_MEDIA_MAX_BYTES: process.env.NEXTAPPS_MEDIA_MAX_BYTES,
  });
  if (!parsed.success) {
    throw new Error(
      `WhatsApp env inválido: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }
  cached = parsed.data;
  return cached;
}
