"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

const editSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(120),
  role: userRoleSchema,
});
type EditValues = z.infer<typeof editSchema>;

interface UserFormProps {
  mode: "create" | "edit";
  user?: User;
}

export function UserForm({ mode, user }: UserFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fotoUrl, setFotoUrl] = useState<string | null>(user?.foto_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [formError, setFormError] = useState<string | null>(null);

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      nome: "",
      role: undefined as unknown as UserRoleValue,
      password: "",
      confirm: "",
    },
  });
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nome: user?.nome ?? "",
      role: (user?.role as UserRoleValue) ?? undefined,
    },
  });

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
      const path = `${current.id}/${user?.id ?? "new"}-${Date.now()}.${ext}`;
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
      const { confirm: _confirm, ...payload } = values;
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
      router.push("/admin/usuarios");
      router.refresh();
    },
    onError: (err) => setFormError((err as Error).message),
  });

  const editMut = useMutation({
    mutationFn: async (values: EditValues) => {
      const res = await fetch(`/api/users/${user!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          is_active: isActive,
          ...(fotoUrl !== (user?.foto_url ?? null) ? { foto_url: fotoUrl } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersKeys.all });
      toast.success("Usuário atualizado");
      router.push("/admin/usuarios");
      router.refresh();
    },
    onError: (err) => setFormError((err as Error).message),
  });

  return (
    <div className="max-w-lg space-y-4">
      {mode === "create" ? (
        <form
          onSubmit={createForm.handleSubmit((v) => {
            setFormError(null);
            createMut.mutate(v);
          })}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...createForm.register("email")} />
            {createForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...createForm.register("nome")} />
            {createForm.formState.errors.nome && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.nome.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <RoleSelect
              id="role"
              value={createForm.watch("role")}
              onChange={(v) =>
                createForm.setValue("role", v, { shouldValidate: true })
              }
            />
            {createForm.formState.errors.role && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.role.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...createForm.register("password")}
            />
            {createForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.password.message}
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
              {...createForm.register("confirm")}
            />
            {createForm.formState.errors.confirm && (
              <p className="text-sm text-destructive">
                {createForm.formState.errors.confirm.message}
              </p>
            )}
          </div>
          <FotoField
            value={fotoUrl}
            uploading={uploading}
            onFile={handleFotoChange}
          />
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Criando..." : "Criar usuário"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/usuarios")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={editForm.handleSubmit((v) => {
            setFormError(null);
            editMut.mutate(v);
          })}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...editForm.register("nome")} />
            {editForm.formState.errors.nome && (
              <p className="text-sm text-destructive">
                {editForm.formState.errors.nome.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <RoleSelect
              id="role"
              value={editForm.watch("role")}
              onChange={(v) =>
                editForm.setValue("role", v, { shouldValidate: true })
              }
            />
          </div>
          <FotoField
            value={fotoUrl}
            uploading={uploading}
            onFile={handleFotoChange}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Ativo
          </label>
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={editMut.isPending}>
              {editMut.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/usuarios")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function FotoField({
  value,
  uploading,
  onFile,
}: {
  value: string | null;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="foto">Foto</Label>
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Foto do usuário"
            className="h-10 w-10 rounded-full object-cover"
          />
        )}
        <Input
          id="foto"
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
      {uploading && (
        <p className="text-xs text-muted-foreground">Enviando...</p>
      )}
    </div>
  );
}
