"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";

import {
  newPasswordFormSchema,
  type NewPasswordFormInput,
} from "@/lib/schemas/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetupPage() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <SetupForm />
    </QueryClientProvider>
  );
}

async function setupPassword(password: string): Promise<void> {
  const res = await fetch("/api/auth/setup-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error("setup-password failed");
  }
}

function SetupForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordFormInput>({
    resolver: zodResolver(newPasswordFormSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: NewPasswordFormInput) => setupPassword(values.password),
    onSuccess: () => {
      router.replace("/");
      router.refresh();
    },
  });

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">Defina sua senha</h2>
        <p className="text-sm text-muted-foreground">
          Este é seu primeiro acesso. Escolha uma nova senha para continuar.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4"
        noValidate
      >
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

        {mutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            Não foi possível definir a senha. Tente novamente.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Continuar"}
        </Button>
      </form>
    </div>
  );
}
