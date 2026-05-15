import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const BUCKET = "chat-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
  };
  return map[mime.toLowerCase()] ?? "bin";
}

export interface UploadChatMediaInput {
  admin: AdminClient;
  waInstanceId: string;
  messageId: string;
  bytes: Uint8Array;
  mimeType: string;
}

// Sobe um arquivo de mídia no bucket chat-media.
// Path: {wa_instance_id}/{message_id}.{ext}
export async function uploadChatMedia({
  admin,
  waInstanceId,
  messageId,
  bytes,
  mimeType,
}: UploadChatMediaInput): Promise<string> {
  const ext = extensionFromMime(mimeType);
  const path = `${waInstanceId}/${messageId}.${ext}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (error) {
    throw new Error(`upload chat-media falhou: ${error.message}`);
  }
  return path;
}

export async function signChatMediaUrl(
  admin: AdminClient,
  path: string
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("[media-storage] signChatMediaUrl", error);
    return null;
  }
  return data.signedUrl;
}

export const CHAT_MEDIA_BUCKET = BUCKET;
