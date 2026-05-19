import { z } from "zod";

const envSchema = z.object({
  META_APP_ID: z.string().min(1, "META_APP_ID obrigatorio"),
  META_APP_SECRET: z.string().min(1, "META_APP_SECRET obrigatorio"),
  META_WEBHOOK_VERIFY_TOKEN: z
    .string()
    .min(16, "META_WEBHOOK_VERIFY_TOKEN deve ter pelo menos 16 chars"),
  META_GRAPH_API_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/, "Formato esperado: v21.0")
    .default("v21.0"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL deve ser URL valida"),
  CRON_SECRET: z.string().min(16).optional(),
});

export type InstagramEnv = z.infer<typeof envSchema>;

let cached: InstagramEnv | null = null;
let cachedNull = false;

// Retorna null quando a feature nao esta configurada (env faltando).
// Rotas de IG devem usar isso pra responder 503 graciosamente em vez de
// quebrar a aplicacao inteira.
export function getInstagramEnv(): InstagramEnv | null {
  if (cached) return cached;
  if (cachedNull) return null;
  const parsed = envSchema.safeParse({
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN,
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  });
  if (!parsed.success) {
    cachedNull = true;
    return null;
  }
  cached = parsed.data;
  return cached;
}

// Versao "forte": throw se env nao configurado. Usar apenas em handlers
// que ja garantem 503 via guard com getInstagramEnv().
export function requireInstagramEnv(): InstagramEnv {
  const env = getInstagramEnv();
  if (!env) {
    throw new Error(
      "Instagram nao configurado. Defina META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN e NEXT_PUBLIC_APP_URL em .env.local"
    );
  }
  return env;
}
