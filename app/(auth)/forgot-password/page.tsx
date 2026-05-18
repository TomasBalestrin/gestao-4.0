"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

const GENERIC_MESSAGE =
  "Se o email existir, enviamos um link para redefinir a senha.";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotValues) {
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    // Erros aqui não revelam se o email existe — mensagem sempre genérica.
    await supabase.auth.resetPasswordForEmail(values.email, { redirectTo });
    setSent(true);
  }

  return (
    <div className="glass rounded-[18px] p-7">
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-[13px] text-text-secondary">{GENERIC_MESSAGE}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Voltar ao login</Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@bethel.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[12px] text-[color:var(--danger-color)]">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar link"}
          </Button>

          <Link
            href="/login"
            className="block text-center text-[11px] text-text-muted underline-offset-4 hover:underline"
          >
            Voltar ao login
          </Link>
        </form>
      )}
    </div>
  );
}
