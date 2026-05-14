"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { z } from "zod";

import type { User } from "@/types/domain";
import { AvatarUpload } from "@/components/users/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const profileSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(120),
  theme_preference: z.enum(["dark", "light", "system"]),
});
type ProfileValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [fotoUrl, setFotoUrl] = useState<string | null>(user.foto_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: user.nome,
      theme_preference:
        (user.theme_preference as ProfileValues["theme_preference"]) ?? "dark",
    },
  });

  async function onSubmit(values: ProfileValues) {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: values.nome,
          theme_preference: values.theme_preference,
          ...(fotoUrl !== user.foto_url ? { foto_url: fotoUrl } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      setTheme(values.theme_preference);
      toast.success("Perfil atualizado");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-lg space-y-5">
      <AvatarUpload
        userId={user.id}
        nome={user.nome}
        currentUrl={fotoUrl}
        onUploaded={setFotoUrl}
      />

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={user.email} readOnly disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register("nome")} />
        {errors.nome && (
          <p className="text-sm text-destructive">{errors.nome.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme">Tema</Label>
        <Select
          value={watch("theme_preference")}
          onValueChange={(v) =>
            setValue("theme_preference", v as ProfileValues["theme_preference"])
          }
        >
          <SelectTrigger id="theme" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Escuro</SelectItem>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
