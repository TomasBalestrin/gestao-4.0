import { requireInstagramEnv } from "@/lib/instagram/env";

// Cliente fino do Meta Graph API. Tipa apenas o que a gente usa.
// Spec: https://developers.facebook.com/docs/instagram-platform

const GRAPH_BASE = "https://graph.facebook.com";

function graphUrl(path: string): string {
  const { META_GRAPH_API_VERSION } = requireInstagramEnv();
  return `${GRAPH_BASE}/${META_GRAPH_API_VERSION}${path}`;
}

interface MetaError {
  message: string;
  type?: string;
  code?: number;
  fbtrace_id?: string;
}

export class MetaApiError extends Error {
  readonly meta: MetaError;
  constructor(meta: MetaError) {
    super(`Meta API: ${meta.message} (code ${meta.code ?? "?"})`);
    this.meta = meta;
  }
}

async function metaFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: MetaError } | null)?.error;
    if (err) throw new MetaApiError(err);
    throw new MetaApiError({
      message: text || `HTTP ${res.status}`,
      code: res.status,
    });
  }
  return body as T;
}

// ===== Mensagens =====

interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}

export async function sendTextMessage(args: {
  igUserId: string;
  accessToken: string;
  recipientPsid: string;
  text: string;
}): Promise<SendMessageResponse> {
  const url = `${graphUrl(`/${args.igUserId}/messages`)}?access_token=${encodeURIComponent(args.accessToken)}`;
  return metaFetch<SendMessageResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: args.recipientPsid },
      message: { text: args.text },
    }),
  });
}

// ===== Perfil =====

interface IgUserProfile {
  name?: string;
  username?: string;
  profile_pic?: string;
}

export async function getUserProfile(args: {
  accessToken: string;
  psid: string;
}): Promise<IgUserProfile> {
  const url = `${graphUrl(`/${args.psid}`)}?fields=name,username,profile_pic&access_token=${encodeURIComponent(args.accessToken)}`;
  return metaFetch<IgUserProfile>(url);
}

// ===== Pages e contas IG ligadas =====

interface PageItem {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

interface PagesResponse {
  data: PageItem[];
}

// Lista as Pages que o user logou via OAuth. Inclui o page_access_token
// (necessario pra operacoes na pagina e na conta IG vinculada).
export async function listUserPages(userAccessToken: string): Promise<PageItem[]> {
  const url = `${graphUrl("/me/accounts")}?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`;
  const body = await metaFetch<PagesResponse>(url);
  return body.data ?? [];
}

interface IgAccountDetails {
  id: string;
  username?: string;
}

export async function getInstagramAccountDetails(args: {
  igUserId: string;
  accessToken: string;
}): Promise<IgAccountDetails> {
  const url = `${graphUrl(`/${args.igUserId}`)}?fields=id,username&access_token=${encodeURIComponent(args.accessToken)}`;
  return metaFetch<IgAccountDetails>(url);
}

// ===== Webhook subscription na Page =====

// O webhook do app precisa estar configurado no painel Meta, e cada Page
// que vai mandar eventos precisa subscribar o app pra receber DMs.
export async function subscribePageToApp(args: {
  pageId: string;
  pageAccessToken: string;
}): Promise<{ success: boolean }> {
  const url = `${graphUrl(`/${args.pageId}/subscribed_apps`)}?subscribed_fields=messages,messaging_postbacks,message_reactions&access_token=${encodeURIComponent(args.pageAccessToken)}`;
  return metaFetch<{ success: boolean }>(url, { method: "POST" });
}

export async function unsubscribePageFromApp(args: {
  pageId: string;
  pageAccessToken: string;
}): Promise<{ success: boolean }> {
  const url = `${graphUrl(`/${args.pageId}/subscribed_apps`)}?access_token=${encodeURIComponent(args.pageAccessToken)}`;
  return metaFetch<{ success: boolean }>(url, { method: "DELETE" });
}
