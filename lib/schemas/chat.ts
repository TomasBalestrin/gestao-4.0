import { z } from "zod";

// ===== Send (cliente → server) =====
export const sendTextSchema = z.object({
  text: z.string().trim().min(1, "Mensagem obrigatória").max(4096),
});
export type SendTextInput = z.infer<typeof sendTextSchema>;

// ===== Listing =====
export const listMessagesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

// ===== Webhook payload (NextTrack → server) =====
// Formato fixo: { event, instanceId, data: { ... } }

const messageReceivedDataSchema = z.object({
  phone: z.string().min(1),
  // Slug visível da instância no painel da NextTrack. Quando presente, tem
  // prioridade sobre o instanceId raiz (que é o UUID interno deles).
  instanceId: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  senderPhoto: z.string().optional().nullable(),
  messageId: z.string().min(1),
  messageType: z.enum([
    "text",
    "image",
    "audio",
    "video",
    "document",
    "location",
    "contact",
    "sticker",
  ]),
  fromMe: z.boolean().default(false),
  isGroup: z.boolean().default(false),
  momment: z.string().optional().nullable(), // ISO 8601 (sic, doc usa "momment")
  text: z
    .object({
      message: z.string().optional().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
  media: z
    .object({
      url: z.string().url().optional().nullable(),
      caption: z.string().optional().nullable(),
      mimeType: z.string().optional().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
  audio: z
    .object({
      audioUrl: z.string().url().optional().nullable(),
      mimeType: z.string().optional().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
  video: z
    .object({
      videoUrl: z.string().url().optional().nullable(),
      caption: z.string().optional().nullable(),
      mimeType: z.string().optional().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
  document: z
    .object({
      url: z.string().url().optional().nullable(),
      filename: z.string().optional().nullable(),
      mimeType: z.string().optional().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .partial()
    .optional()
    .nullable(),
  contact: z
    .object({
      name: z.string().optional().nullable(),
      number: z.string().optional().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
});

const connectionDataSchema = z.object({
  phone: z.string().optional().nullable(),
  connectedPhone: z.string().optional().nullable(),
  status: z.enum(["connected", "disconnected"]).optional(),
  // Slug visível da instância. Mesma observação do messageReceived.
  instanceId: z.string().optional().nullable(),
  timestamp: z.number().optional().nullable(),
});

const messageReceivedEventSchema = z.object({
  event: z.literal("message_received"),
  instanceId: z.string().min(1),
  data: messageReceivedDataSchema,
});

const connectedEventSchema = z.object({
  event: z.literal("connected"),
  instanceId: z.string().min(1),
  data: connectionDataSchema,
});

const disconnectedEventSchema = z.object({
  event: z.literal("disconnected"),
  instanceId: z.string().min(1),
  data: connectionDataSchema,
});

export const webhookEventSchema = z.discriminatedUnion("event", [
  messageReceivedEventSchema,
  connectedEventSchema,
  disconnectedEventSchema,
]);
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type MessageReceivedEvent = z.infer<typeof messageReceivedEventSchema>;
export type ConnectedEvent = z.infer<typeof connectedEventSchema>;
export type DisconnectedEvent = z.infer<typeof disconnectedEventSchema>;
