import { getWhatsAppEnv } from "./env";

// Cliente HTTP do provider NextAPI (baileys-based, não-oficial).
// Os endpoints abaixo seguem a convenção comum dos providers tipo NextAPI/Evolution.
// Se o provider real usar paths diferentes, ajustar aqui (único ponto de mudança).

export interface NextApiCreateInstanceResponse {
  instanceId: string;
  instanceToken: string;
  qrCode?: string | null; // base64 PNG (sem o prefixo data:image/png;base64,)
  status?: string;
}

export interface NextApiInstanceStatus {
  status: "pending" | "qr_pending" | "connected" | "disconnected" | string;
  qrCode?: string | null;
  phoneNumber?: string | null;
}

export interface NextApiSendTextInput {
  instanceId: string;
  instanceToken: string;
  toJid: string;
  text: string;
}

export interface NextApiSendMediaInput {
  instanceId: string;
  instanceToken: string;
  toJid: string;
  mediaUrl?: string;
  mediaBase64?: string;
  mimeType: string;
  filename?: string;
  caption?: string;
  contentType: "image" | "audio" | "video" | "document";
}

export interface NextApiSendResponse {
  messageId: string;
}

export interface NextApiDownloadResponse {
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

async function request<T>(
  path: string,
  init: RequestInit & { authToken?: string } = {}
): Promise<T> {
  const env = getWhatsAppEnv();
  const url = `${env.NEXTAPI_BASE_URL.replace(/\/$/, "")}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${init.authToken ?? env.NEXTAPI_MASTER_TOKEN}`);

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new NextApiError(
      `NextAPI ${path} retornou ${res.status}`,
      res.status,
      json
    );
  }
  return json as T;
}

export async function createInstance(externalUserId: string) {
  return request<NextApiCreateInstanceResponse>("/instances", {
    method: "POST",
    body: JSON.stringify({ externalUserId }),
  });
}

export async function getInstanceStatus(instanceId: string, instanceToken: string) {
  return request<NextApiInstanceStatus>(
    `/instances/${encodeURIComponent(instanceId)}/status`,
    { method: "GET", authToken: instanceToken }
  );
}

export async function deleteInstance(instanceId: string, instanceToken: string) {
  return request<{ success: boolean }>(
    `/instances/${encodeURIComponent(instanceId)}`,
    { method: "DELETE", authToken: instanceToken }
  );
}

export async function sendText(input: NextApiSendTextInput) {
  return request<NextApiSendResponse>(
    `/instances/${encodeURIComponent(input.instanceId)}/messages/text`,
    {
      method: "POST",
      authToken: input.instanceToken,
      body: JSON.stringify({ to: input.toJid, text: input.text }),
    }
  );
}

export async function sendMedia(input: NextApiSendMediaInput) {
  return request<NextApiSendResponse>(
    `/instances/${encodeURIComponent(input.instanceId)}/messages/media`,
    {
      method: "POST",
      authToken: input.instanceToken,
      body: JSON.stringify({
        to: input.toJid,
        contentType: input.contentType,
        mediaUrl: input.mediaUrl,
        mediaBase64: input.mediaBase64,
        mimeType: input.mimeType,
        filename: input.filename,
        caption: input.caption,
      }),
    }
  );
}

export async function downloadMedia(mediaUrl: string): Promise<NextApiDownloadResponse> {
  const env = getWhatsAppEnv();
  const res = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${env.NEXTAPI_MASTER_TOKEN}`,
    },
  });
  if (!res.ok) {
    throw new NextApiError(
      `Falha ao baixar mídia (${res.status})`,
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
