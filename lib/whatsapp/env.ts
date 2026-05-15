import { z } from "zod";

const envSchema = z.object({
  NEXTAPI_BASE_URL: z.string().url("NEXTAPI_BASE_URL deve ser uma URL válida"),
  NEXTAPI_MASTER_TOKEN: z.string().min(1, "NEXTAPI_MASTER_TOKEN obrigatório"),
  NEXTAPI_WEBHOOK_SECRET: z
    .string()
    .min(16, "NEXTAPI_WEBHOOK_SECRET deve ter pelo menos 16 caracteres"),
  NEXTAPI_MEDIA_MAX_BYTES: z.coerce.number().int().positive().default(16777216),
});

export type WhatsAppEnv = z.infer<typeof envSchema>;

let cached: WhatsAppEnv | null = null;

export function getWhatsAppEnv(): WhatsAppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    NEXTAPI_BASE_URL: process.env.NEXTAPI_BASE_URL,
    NEXTAPI_MASTER_TOKEN: process.env.NEXTAPI_MASTER_TOKEN,
    NEXTAPI_WEBHOOK_SECRET: process.env.NEXTAPI_WEBHOOK_SECRET,
    NEXTAPI_MEDIA_MAX_BYTES: process.env.NEXTAPI_MEDIA_MAX_BYTES,
  });
  if (!parsed.success) {
    throw new Error(
      `WhatsApp env inválido: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }
  cached = parsed.data;
  return cached;
}
