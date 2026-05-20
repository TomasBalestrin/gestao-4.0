import OpenAI from "openai";

import { requireGoogleEnv } from "@/lib/google/env";

// Singleton OpenAI client. Reusa env validador do Google (mesma feature).
let cached: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cached) return cached;
  const env = requireGoogleEnv();
  cached = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cached;
}

// Trunca texto preservando inicio e fim. Usado pra evitar estouro de context
// window mantendo o sinal mais importante (abertura + fechamento da call).
export function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor((maxChars - 50) / 2);
  const start = text.slice(0, half);
  const end = text.slice(text.length - half);
  return `${start}\n\n[... trecho do meio omitido (${text.length - maxChars} chars) ...]\n\n${end}`;
}
