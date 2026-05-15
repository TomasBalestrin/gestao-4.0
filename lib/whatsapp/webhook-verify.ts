import { timingSafeEqual } from "crypto";

// O NextTrack não documenta HMAC; usamos um secret em query string na
// Callback URL configurada no painel deles:
//   https://seu-dominio.com/api/whatsapp/webhook?secret=<NEXTAPPS_WEBHOOK_SECRET>
// Constant-time compare evita timing attacks.
export function verifyWebhookSecret(
  provided: string | null | undefined,
  expected: string
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
