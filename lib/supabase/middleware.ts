import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database, UserRole } from "@/lib/database.types";
import { isAdmin, isCloser } from "@/lib/utils/permissions";

const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/forgot-password",
  "/reset-password",
];

// Cache em memória de perfil (role/is_active/must_change_password) por 30s.
// Evita 1 query Postgres por request — gargalo principal de navegação.
// Single-instance no MVP; multi-instance precisa migrar para Redis.
// Invalidado em signOut e quando o admin atualiza o usuário (via UPDATE no backend).
interface CachedProfile {
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  expiresAt: number;
}
const PROFILE_TTL_MS = 30_000;
const profileCache = new Map<string, CachedProfile>();

export function invalidateProfileCache(userId: string): void {
  profileCache.delete(userId);
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isCloserPath(pathname: string): boolean {
  return pathname === "/closer" || pathname.startsWith("/closer/");
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: getUser() refreshes the session if needed. Do not run code
  // between createServerClient and getUser() — auth state could desync.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  // Não autenticado em rota privada → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const now = Date.now();
    const cached = profileCache.get(user.id);
    let profile: Pick<CachedProfile, "role" | "is_active" | "must_change_password"> | null = null;

    if (cached && cached.expiresAt > now) {
      profile = cached;
    } else {
      const { data } = await supabase
        .from("users")
        .select("role, is_active, must_change_password")
        .eq("id", user.id)
        .single();
      if (data) {
        profile = data;
        profileCache.set(user.id, { ...data, expiresAt: now + PROFILE_TTL_MS });
        // Limpeza esporádica de entradas expiradas.
        if (profileCache.size > 1000) {
          for (const [k, v] of profileCache) if (v.expiresAt <= now) profileCache.delete(k);
        }
      }
    }

    // Conta desativada → desloga e volta para /login
    if (profile && !profile.is_active) {
      profileCache.delete(user.id);
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Primeiro login: força troca de senha
    if (
      profile?.must_change_password &&
      pathname !== "/setup" &&
      !pathname.startsWith("/auth/")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }

    // RBAC mínimo de rota: /admin/* só para admin
    if (isAdminPath(pathname) && !isAdmin(profile?.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // /closer/* só para closer (admin entra para suporte/preview)
    if (
      isCloserPath(pathname) &&
      !isCloser(profile?.role) &&
      !isAdmin(profile?.role)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Autenticado tentando acessar telas de auth → manda para a home.
    // /setup é exceção: usuários com must_change_password precisam acessá-lo,
    // e o bloco acima já roteia quem realmente precisa para /setup.
    if (
      isPublic &&
      pathname !== "/reset-password" &&
      pathname !== "/setup"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
