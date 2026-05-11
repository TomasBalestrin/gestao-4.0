import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// ===== Rate limiting (in-memory; aceitável no MVP single-instance — security.md §4) =====
// Em produção multi-instância, trocar por @upstash/ratelimit + Upstash Redis
// (vars UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
const WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  resetAt: number;
}
const store = new Map<string, Bucket>();

function limitFor(pathname: string): number | null {
  if (pathname.startsWith("/api/auth/")) return 5;
  if (pathname.startsWith("/api/cards/") && pathname.endsWith("/move")) return 30;
  if (pathname === "/api/calls") return 10;
  if (pathname.startsWith("/api/")) return 60;
  return null;
}

function clientId(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "anon";
}

function checkRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const limit = limitFor(pathname);
  if (limit === null) return null;

  const bucketKey = pathname.startsWith("/api/auth/")
    ? "auth"
    : pathname.startsWith("/api/cards/") && pathname.endsWith("/move")
      ? "move"
      : pathname === "/api/calls"
        ? "calls"
        : "api";
  const key = `${clientId(request)}:${bucketKey}`;
  const now = Date.now();

  // Limpeza esporádica de entradas expiradas.
  if (store.size > 5000) {
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  entry.count += 1;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Muitas requisições, tente novamente em instantes", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const limited = checkRateLimit(request);
  if (limited) return limited;
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
