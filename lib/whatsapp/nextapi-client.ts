import { getWhatsAppEnv } from "./env";
import { getAccessToken, refreshAccessToken } from "./auth";

// Cliente HTTP do NextTrack (https://service.nexttrack.com.br).
// Endpoints usados:
//   POST /api/chats/instances/:instanceId/send   — envia texto ou imagem
// Inbound chega via webhook (formato { event, instanceId, data }) e mídia é
// baixada da URL pública embutida no payload.

export interface SendTextInput {
  instanceId: string;
  phone: string; // dígitos puros, ex: 5511999999999
  message: string;
}

export interface SendImageInput {
  instanceId: string;
  phone: string;
  message: string; // legenda (pode ser vazio)
  imageUrl: string; // URL pública (signed URL do storage)
}

export interface SendResponse {
  messageId?: string;
  success?: boolean;
}

export interface DownloadResponse {
  contentType: string;
  bytes: Uint8Array;
  size: number;
}

export class NextApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "NextApiError";
    this.status = status;
    this.body = body;
  }
}

async function authedFetch(
  path: string,
  init: RequestInit
): Promise<Response> {
  const env = getWhatsAppEnv();
  const url = `${env.NEXTAPPS_BASE_URL.replace(/\/$/, "")}${path}`;
  let token = await getAccessToken();
  let res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (res.status === 401) {
    token = await refreshAccessToken();
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  }
  return res;
}

async function sendRequest(
  instanceId: string,
  body: Record<string, unknown>
): Promise<SendResponse> {
  const res = await authedFetch(
    `/api/chats/instances/${encodeURIComponent(instanceId)}/send`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new NextApiError(
      `NextApps send retornou ${res.status}`,
      res.status,
      json
    );
  }
  return json as SendResponse;
}

export function sendText(input: SendTextInput): Promise<SendResponse> {
  return sendRequest(input.instanceId, {
    phone: input.phone,
    message: input.message,
  });
}

export function sendImage(input: SendImageInput): Promise<SendResponse> {
  return sendRequest(input.instanceId, {
    phone: input.phone,
    type: "image",
    message: input.message,
    imageUrl: input.imageUrl,
  });
}

// Faz download de URL pública de mídia inbound (sem auth, é URL pública do CDN
// do provider). Retorna bytes + content-type pra re-hospedar no nosso storage.
export async function downloadInboundMedia(
  mediaUrl: string
): Promise<DownloadResponse> {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new NextApiError(
      `Falha ao baixar mídia inbound (${res.status})`,
      res.status,
      null
    );
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  return {
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    bytes: buf,
    size: buf.byteLength,
  };
}
