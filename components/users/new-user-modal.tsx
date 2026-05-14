"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";

import { userRoleSchema, type UserRoleValue } from "@/lib/schemas/funil";
import { passwordSchema } from "@/lib/schemas/user";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/domain";
import { usersKeys } from "@/components/users/users-table";
import { RoleSelect } from "@/components/forms/role-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const createSchema = z
  .object({
    email: z.string().email("Email inválido"),
    nome: z.string().min(1, "Nome obrigatório").max(120),
    role: userRoleSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });
type CreateValues = z.infer<typeof createSchema>;

export function NewUserModal() {
  const [open, setOpen] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      nome: "",
      role: undefined as unknown as UserRoleValue,
      password: "",
      confirm: "",
    },
  });

  function resetAll() {
    form.reset();
    setFotoUrl(null);
    setFormError(null);
  }

  async function handleFotoChange(file: File) {
    setFormError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user: current },
      } = await supabase.auth.getUser();
      if (!current) throw new Error("Sessão expirada");
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${current.id}/new-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setFotoUrl(data.publicUrl);
      toast.success("Foto enviada");
    } catch (err) {
      setFormError(`Falha no upload da foto: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  const createMut = useMutation({
    mutationFn: async (values: CreateValues) => {
      const { confirm: _c, ...payload } = values;
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | { data?: { user: User }; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body!.data!;
    },
    onSuccess: async (data) => {
      void queryClient.invalidateQueries({ queryKey: usersKeys.all });
      if (fotoUrl) {
        await fetch(`/api/users/${data.user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foto_url: fotoUrl }),
        });
      }
      toast.success("Usuário criado");
      resetAll();
      setOpen(false);
    },
    onError: (err) => setFormError((err as Error).message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetAll();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[85vh] max-h-[720px] flex-col gap-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Defina a senha que o usuário vai usar no primeiro acesso.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) => {
            setFormError(null);
            createMut.mutate(v);
          })}
          className="mt-4 flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="foto">Foto do perfil</Label>
              <div className="flex items-center gap-3">
                {fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoUrl}
                    alt="Foto do usuário"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
                    sem foto
                  </div>
                )}
                <Input
                  id="foto"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFotoChange(f);
                  }}
                />
              </div>
              {uploading && (
                <p className="text-xs text-muted-foreground">Enviando...</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" {...form.register("nome")} />
              {form.formState.errors.nome && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.nome.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, com ao menos 1 letra e 1 número.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...form.register("confirm")}
              />
              {form.formState.errors.confirm && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirm.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <RoleSelect
                id="role"
                value={form.watch("role")}
                onChange={(v) =>
                  form.setValue("role", v, { shouldValidate: true })
                }
              />
              {form.formState.errors.role && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
          </div>

          <div className="mt-4 flex shrink-0 justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetAll();
                setOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
