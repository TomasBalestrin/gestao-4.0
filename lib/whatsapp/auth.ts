import { getWhatsAppEnv } from "./env";

// Login + refresh token do NextTrack. Cache em memória do módulo: a primeira
// chamada faz login, as próximas reusam o accessToken. Em caso de 401, o
// caller chama invalidateToken() e tenta de novo (auto-refresh).
// Serverless: cada lambda mantém o próprio cache; aceitável.

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  // Não usamos exp do JWT — refresh é reativo ao 401.
}

let cached: AuthTokens | null = null;
let inflight: Promise<AuthTokens> | null = null;

export class NextAppsAuthError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "NextAppsAuthError";
    this.status = status;
    this.body = body;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const env = getWhatsAppEnv();
  const url = `${env.NEXTAPPS_BASE_URL.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new NextAppsAuthError(
      `NextApps auth ${path} retornou ${res.status}`,
      res.status,
      json
    );
  }
  return json as T;
}

async function doLogin(): Promise<AuthTokens> {
  const env = getWhatsAppEnv();
  const data = await postJson<{ accessToken: string; refreshToken: string }>(
    "/api/auth/login",
    { email: env.NEXTAPPS_EMAIL, password: env.NEXTAPPS_PASSWORD }
  );
  if (!data.accessToken || !data.refreshToken) {
    throw new NextAppsAuthError(
      "Login NextApps sem accessToken/refreshToken",
      500,
      data
    );
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

async function doRefresh(refreshToken: string): Promise<AuthTokens> {
  const data = await postJson<{ accessToken: string; refreshToken: string }>(
    "/api/auth/refresh-token",
    { refreshToken }
  );
  if (!data.accessToken || !data.refreshToken) {
    throw new NextAppsAuthError(
      "Refresh NextApps sem accessToken/refreshToken",
      500,
      data
    );
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export async function getAccessToken(): Promise<string> {
  if (cached) return cached.accessToken;
  if (inflight) return (await inflight).accessToken;
  inflight = doLogin()
    .then((t) => {
      cached = t;
      return t;
    })
    .finally(() => {
      inflight = null;
    });
  return (await inflight).accessToken;
}

// Forçar refresh quando uma chamada autenticada retornar 401.
// Se o refresh falhar, faz login do zero.
export async function refreshAccessToken(): Promise<string> {
  if (inflight) return (await inflight).accessToken;
  const refresh = cached?.refreshToken;
  inflight = (
    refresh
      ? doRefresh(refresh).catch(() => doLogin())
      : doLogin()
  )
    .then((t) => {
      cached = t;
      return t;
    })
    .finally(() => {
      inflight = null;
    });
  return (await inflight).accessToken;
}

export function invalidateAuthCache(): void {
  cached = null;
}
