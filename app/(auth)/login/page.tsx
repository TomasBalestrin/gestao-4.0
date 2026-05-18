"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginValues = z.infer<typeof loginSchema>;

function reasonMessage(reason: string | null): string | null {
  switch (reason) {
    case "expired":
      return "Sua sessão expirou. Faça login novamente.";
    case "deactivated":
      return "Conta desativada. Fale com um administrador.";
    default:
      return null;
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="glass rounded-[18px] p-7" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(
    reasonMessage(searchParams.get("reason"))
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error || !data.user) {
      setFormError("Credenciais inválidas.");
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_active, must_change_password")
      .eq("id", data.user.id)
      .single();

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      setFormError("Conta desativada. Fale com um administrador.");
      return;
    }

    if (profile?.must_change_password) {
      router.replace("/setup");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="glass rounded-[18px] p-7">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            <p className="text-[12px] text-[color:var(--danger-color)]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[12px] text-[color:var(--danger-color)]">
              {errors.password.message}
            </p>
          )}
        </div>

        {formError && (
          <p className="text-[13px] text-[color:var(--danger-color)] rounded-[8px] bg-[var(--danger-soft)] px-3 py-2" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
