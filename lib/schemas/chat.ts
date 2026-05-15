import { z } from "zod";

// ===== Send (cliente → server) =====
export const sendTextSchema = z.object({
  text: z.string().trim().min(1, "Mensagem obrigatória").max(4096),
});
export type SendTextInput = z.infer<typeof sendTextSchema>;

export const sendMediaCaptionSchema = z.object({
  caption: z.string().trim().max(1024).optional(),
});

// ===== Listing =====
export const listMessagesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

// ===== Webhook payload (provider → server) =====
// O schema é tolerante: discriminated union por `event`, campos extras passam.
// Conexão
const connectionUpdateSchema = z.object({
  event: z.literal("connection.update"),
  instanceId: z.string().min(1),
  status: z.enum(["open", "close", "connecting", "qr"]),
  phoneNumber: z.string().optional().nullable(),
  qrCode: z.string().optional().nullable(),
});

// Upsert (mensagem nova, inbound ou fromMe via app oficial)
const messagesUpsertSchema = z.object({
  event: z.literal("messages.upsert"),
  instanceId: z.string().min(1),
  messageId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().optional().nullable(),
  fromMe: z.boolean().default(false),
  isGroup: z.boolean().default(false),
  pushName: z.string().optional().nullable(),
  type: z.enum([
    "text",
    "image",
    "audio",
    "video",
    "document",
    "sticker",
    "location",
    "unsupported",
  ]),
  text: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  filename: z.string().optional().nullable(),
  size: z.number().int().nonnegative().optional().nullable(),
  timestamp: z.number().int(), // epoch seconds
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Update (delivery/read receipt)
const messagesUpdateSchema = z.object({
  event: z.literal("messages.update"),
  instanceId: z.string().min(1),
  messageId: z.string().min(1),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  failedReason: z.string().optional().nullable(),
  timestamp: z.number().int().optional(),
});

export const webhookEventSchema = z.discriminatedUnion("event", [
  connectionUpdateSchema,
  messagesUpsertSchema,
  messagesUpdateSchema,
]);
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type ConnectionUpdateEvent = z.infer<typeof connectionUpdateSchema>;
export type MessagesUpsertEvent = z.infer<typeof messagesUpsertSchema>;
export type MessagesUpdateEvent = z.infer<typeof messagesUpdateSchema>;
