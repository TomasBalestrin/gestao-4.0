import { NextResponse } from "next/server";
import { z } from "zod";

// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover após resolver o problema
// Não expõe valores, apenas mostra qual variável está falhando na validação.
export async function GET() {
  const checks = {
    GOOGLE_OAUTH_CLIENT_ID: checkVar("GOOGLE_OAUTH_CLIENT_ID", z.string().min(1)),
    GOOGLE_OAUTH_CLIENT_SECRET: checkVar("GOOGLE_OAUTH_CLIENT_SECRET", z.string().min(1)),
    GOOGLE_OAUTH_REDIRECT_URI: checkVar("GOOGLE_OAUTH_REDIRECT_URI", z.string().url()),
    OPENAI_API_KEY: checkVar("OPENAI_API_KEY", z.string().min(1)),
    NEXT_PUBLIC_APP_URL: checkVar("NEXT_PUBLIC_APP_URL", z.string().url()),
    CRON_SECRET: checkVar("CRON_SECRET", z.string().min(16).optional()),
  };

  const failed = Object.entries(checks)
    .filter(([, v]) => !v.ok)
    .map(([k, v]) => ({ var: k, problem: v.problem }));

  return NextResponse.json({
    allOk: failed.length === 0,
    failed,
    passed: Object.entries(checks).filter(([, v]) => v.ok).map(([k]) => k),
  });
}

function checkVar(name: string, schema: z.ZodTypeAny): { ok: boolean; problem?: string } {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return { ok: false, problem: "ausente ou vazia" };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, problem: result.error.issues[0]?.message ?? "formato inválido" };
  }
  return { ok: true };
}
