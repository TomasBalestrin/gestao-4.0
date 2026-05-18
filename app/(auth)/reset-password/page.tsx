"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Za-z]/, "Inclua ao menos 1 letra")
      .regex(/[0-9]/, "Inclua ao menos 1 número"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

type ResetValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: ResetValues) {
    setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setFormError(
        "Não foi possível redefinir a senha. O link pode ter expirado."
      );
      return;
    }

    router.replace("/login?reason=reset");
  }

  return (
    <div className="glass rounded-[18px] p-7">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[12px] text-[color:var(--danger-color)]">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
          />
          {errors.confirm && (
            <p className="text-[12px] text-[color:var(--danger-color)]">
              {errors.confirm.message}
            </p>
          )}
        </div>

        {formError && (
          <div className="space-y-2">
            <p className="text-[12px] text-[color:var(--danger-color)]" role="alert">
              {formError}
            </p>
            <Link
              href="/forgot-password"
              className="text-[11px] text-text-muted underline-offset-4 hover:underline"
            >
              Solicitar novo link
            </Link>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </div>
  );
}
