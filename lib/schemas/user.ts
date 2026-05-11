import { z } from "zod";

// Política de senha (security.md §1): mínimo 8 caracteres, ao menos 1 letra e 1 número.
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Za-z]/, "Inclua ao menos 1 letra")
  .regex(/[0-9]/, "Inclua ao menos 1 número");

export const setupPasswordSchema = z.object({
  password: passwordSchema,
});
export type SetupPasswordInput = z.infer<typeof setupPasswordSchema>;

// Form client com confirmação (usado em /setup e /reset-password).
export const newPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });
export type NewPasswordFormInput = z.infer<typeof newPasswordFormSchema>;
