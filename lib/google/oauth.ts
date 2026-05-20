import { OAuth2Client } from "google-auth-library";

import { requireGoogleEnv } from "@/lib/google/env";

// Fluxo OAuth 2.0 do Google pra Drive readonly + email.
// Spec: https://developers.google.com/identity/protocols/oauth2/web-server

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

// Factory de OAuth2Client. Cada request cria o seu pra evitar contaminacao
// entre usuarios.
export function createOAuthClient(): OAuth2Client {
  const env = requireGoogleEnv();
  return new OAuth2Client({
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
  });
}

// Monta URL de consent screen. access_type=offline garante refresh_token;
// prompt=consent forca novo refresh_token mesmo se ja deu consent antes.
export function buildAuthUrl(args: { state: string }): string {
  const oauth = createOAuthClient();
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: args.state,
    include_granted_scopes: true,
  });
}

export interface GoogleTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

// Passo 1: code -> access_token + refresh_token.
export async function exchangeCodeForToken(code: string): Promise<GoogleTokenSet> {
  const oauth = createOAuthClient();
  const { tokens } = await oauth.getToken(code);
  if (!tokens.access_token) {
    throw new Error("exchangeCodeForToken: access_token ausente na resposta");
  }
  // expiry_date vem como timestamp ms; converter pra expires_in segundos.
  const expiresIn = tokens.expiry_date
    ? Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000))
    : 3600;
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expires_in: expiresIn,
    scope: tokens.scope ?? undefined,
    token_type: tokens.token_type ?? undefined,
    id_token: tokens.id_token ?? undefined,
  };
}

// Refresh: usa refresh_token pra pegar novo access_token.
export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokenSet> {
  const oauth = createOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("refreshAccessToken: access_token ausente na resposta");
  }
  const expiresIn = credentials.expiry_date
    ? Math.max(0, Math.floor((credentials.expiry_date - Date.now()) / 1000))
    : 3600;
  return {
    access_token: credentials.access_token,
    // Google geralmente nao retorna refresh_token no refresh; mantem o antigo.
    refresh_token: credentials.refresh_token ?? refreshToken,
    expires_in: expiresIn,
    scope: credentials.scope ?? undefined,
    token_type: credentials.token_type ?? undefined,
  };
}

// Revoga token (qualquer um, access ou refresh). Usar no disconnect.
export async function revokeToken(token: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// Email do usuario que autorizou. Usado pra mostrar "Conectado como X" na UI.
export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

// Gera state CSRF aleatorio.
export function generateState(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
