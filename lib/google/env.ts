import { z } from "zod";

const envSchema = z.object({
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1, "GOOGLE_OAUTH_CLIENT_ID obrigatorio"),
  GOOGLE_OAUTH_CLIENT_SECRET: z
    .string()
    .min(1, "GOOGLE_OAUTH_CLIENT_SECRET obrigatorio"),
  GOOGLE_OAUTH_REDIRECT_URI: z
    .string()
    .url("GOOGLE_OAUTH_REDIRECT_URI deve ser URL valida"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY obrigatorio"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL deve ser URL valida"),
  CRON_SECRET: z.string().min(16).optional(),
});

export type GoogleEnv = z.infer<typeof envSchema>;

let cached: GoogleEnv | null = null;
let cachedNull = false;

// Retorna null quando a feature nao esta configurada. Rotas devem usar isso
// pra responder 503 em vez de quebrar a app.
export function getGoogleEnv(): GoogleEnv | null {
  if (cached) return cached;
  if (cachedNull) return null;
  const parsed = envSchema.safeParse({
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
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

export function requireGoogleEnv(): GoogleEnv {
  const env = getGoogleEnv();
  if (!env) {
    throw new Error(
      "Google Drive nao configurado. Defina GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI, OPENAI_API_KEY em .env.local"
    );
  }
  return env;
}
