import { z } from "zod";

// Configuracao da integration de Google Drive (PATCH do closer).
// Tokens NUNCA sao alterados via API publica (somente OAuth callback + cron).
export const googleDriveConfigSchema = z.object({
  folder_id: z
    .string()
    .min(1, "Pasta obrigatoria")
    .max(200, "folder_id muito longo"),
  folder_name: z.string().min(1).max(500).optional().nullable(),
  file_keywords: z
    .array(z.string().trim().min(1).max(100))
    .min(1, "Pelo menos 1 palavra-chave")
    .max(10, "Maximo 10 palavras-chave"),
  file_mime_types: z
    .array(z.string().min(1).max(200))
    .min(1, "Pelo menos 1 tipo de arquivo")
    .max(10)
    .optional(),
});

export type GoogleDriveConfigInput = z.infer<typeof googleDriveConfigSchema>;
