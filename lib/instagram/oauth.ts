import { requireInstagramEnv } from "@/lib/instagram/env";

// Fluxo OAuth do Facebook Login pra Instagram Messaging.
// Spec: https://developers.facebook.com/docs/facebook-login/guides/access-tokens

const OAUTH_DIALOG_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const GRAPH_OAUTH_URL = "https://graph.facebook.com/v21.0/oauth/access_token";

// Permissoes que pedimos no consent screen. Sao as listadas em
// docs/instagram-setup.md secao 6.
const SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_show_list",
  "business_management",
];

export function buildAuthUrl(args: {
  state: string;
  funilId: string;
}): string {
  const env = requireInstagramEnv();
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/instagram/oauth/callback`,
    state: args.state,
    scope: SCOPES.join(","),
    response_type: "code",
  });
  return `${OAUTH_DIALOG_URL}?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

// Passo 1: code -> short-lived token (1 hora).
export async function exchangeCodeForToken(code: string): Promise<ShortLivedTokenResponse> {
  const env = requireInstagramEnv();
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/instagram/oauth/callback`,
    code,
  });
  const res = await fetch(`${GRAPH_OAUTH_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exchangeCodeForToken falhou: ${res.status} ${text}`);
  }
  return (await res.json()) as ShortLivedTokenResponse;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Passo 2: short-lived -> long-lived (60 dias).
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<LongLivedTokenResponse> {
  const env = requireInstagramEnv();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_OAUTH_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exchangeForLongLivedToken falhou: ${res.status} ${text}`);
  }
  return (await res.json()) as LongLivedTokenResponse;
}

// Refresh de long-lived token. Funciona enquanto o token atual ainda for
// valido (i.e., a gente chama proativamente antes de expirar).
export async function refreshLongLivedToken(
  currentToken: string
): Promise<LongLivedTokenResponse> {
  return exchangeForLongLivedToken(currentToken);
}

// Revoga permissoes do app pra um usuario. Usar no disconnect.
export async function revokeAppPermissions(
  userAccessToken: string
): Promise<{ success: boolean }> {
  const params = new URLSearchParams({ access_token: userAccessToken });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/permissions?${params.toString()}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    return { success: false };
  }
  return (await res.json()) as { success: boolean };
}

// Gera state CSRF aleatorio. Usado pra anti-csrf no OAuth flow.
export function generateState(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
