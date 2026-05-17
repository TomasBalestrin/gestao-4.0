"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Plus } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) => {
            setFormError(null);
            createMut.mutate(v);
          })}
          className="flex min-h-0 flex-col"
          noValidate
        >
          <div className="-mx-1 space-y-5 overflow-y-auto px-1">
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Enviar foto do perfil"
                className="group relative h-24 w-24 overflow-hidden rounded-full border bg-secondary transition-opacity ring-offset-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoUrl}
                    alt="Foto do usuário"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Camera className="h-7 w-7" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                  {uploading ? "Enviando..." : fotoUrl ? "Trocar foto" : "Enviar foto"}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFotoChange(f);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                Clique para {fotoUrl ? "trocar a" : "enviar uma"} foto
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" {...form.register("nome")} />
                {form.formState.errors.nome && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.nome.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
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
              </div>
              <div className="space-y-1.5">
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
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Mínimo 8 caracteres, com ao menos 1 letra e 1 número.
            </p>

            <div className="space-y-1.5">
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

          <div className="mt-4 flex shrink-0 justify-end gap-2 border-t pt-4">            <Button
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
