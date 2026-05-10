"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const setupSchema = z
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

type SetupValues = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: SetupValues) {
    setFormError(null);

    const res = await fetch("/api/auth/setup-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: values.password }),
    });

    if (!res.ok) {
      setFormError("Não foi possível definir a senha. Tente novamente.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">Defina sua senha</h2>
        <p className="text-sm text-muted-foreground">
          Este é seu primeiro acesso. Escolha uma nova senha para continuar.
        </p>
      </div>

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
            <p className="text-sm text-destructive">
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
            <p className="text-sm text-destructive">
              {errors.confirm.message}
            </p>
          )}
        </div>

        {formError && (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Continuar"}
        </Button>
      </form>
    </div>
  );
}
