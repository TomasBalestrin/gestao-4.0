"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Smartphone } from "lucide-react";
import { z } from "zod";

import { cn } from "@/lib/utils/cn";
import { useProfileStore } from "@/lib/stores/profileStore";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { isAdmin as isAdminRole } from "@/lib/utils/permissions";
import { useMyWhatsApp } from "@/hooks/useMyWhatsApp";
import { AvatarUpload } from "@/components/users/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface MeResponse {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
  theme_preference: "dark" | "light" | "system" | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body!.data as T;
}

export function ProfileSheet() {
  const open = useProfileStore((s) => s.profileOpen);
  const close = useProfileStore((s) => s.closeProfile);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Perfil</DialogTitle>
          <DialogDescription>
            Atualize seus dados e preferências.
          </DialogDescription>
        </DialogHeader>
        {open && <ProfileSheetBody onClose={close} />}
      </DialogContent>
    </Dialog>
  );
}

function ProfileSheetBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { userId, role } = useCurrentUser();
  const { setTheme } = useTheme();
  const admin = isAdminRole(role);

  const meQuery = useQuery({
    queryKey: ["me", userId],
    queryFn: () => getJson<MeResponse>(`/api/users/${userId}`),
  });

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waOpen, setWaOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nome: "", theme_preference: "dark" },
  });

  useEffect(() => {
    if (!meQuery.data) return;
    reset({
      nome: meQuery.data.nome,
      theme_preference: meQuery.data.theme_preference ?? "dark",
    });
    setFotoUrl(meQuery.data.foto_url);
  }, [meQuery.data, reset]);

  async function onSubmit(values: ProfileValues) {
    if (!meQuery.data) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: values.nome,
          theme_preference: values.theme_preference,
          ...(fotoUrl !== meQuery.data.foto_url ? { foto_url: fotoUrl } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      setTheme(values.theme_preference);
      toast.success("Perfil atualizado");
      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (meQuery.isLoading || !meQuery.data) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
    );
  }

  const me = meQuery.data;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 flex min-h-0 flex-col gap-5 overflow-y-auto px-1"
      noValidate
    >
      <AvatarUpload
        userId={userId}
        nome={me.nome}
        currentUrl={fotoUrl}
        onUploaded={setFotoUrl}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" {...register("nome")} />
          {errors.nome && (
            <p className="text-sm text-destructive">{errors.nome.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={me.email} readOnly disabled />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="theme">Tema</Label>
        <Select
          value={watch("theme_preference")}
          onValueChange={(v) =>
            setValue(
              "theme_preference",
              v as ProfileValues["theme_preference"],
              { shouldDirty: true }
            )
          }
        >
          <SelectTrigger id="theme" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Escuro</SelectItem>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!admin && (
        <WhatsAppAccordion open={waOpen} onToggle={() => setWaOpen((o) => !o)} />
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-2 flex shrink-0 justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function statusBadge(status: string | undefined) {
  switch (status) {
    case "connected":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Conectado
        </Badge>
      );
    case "qr_pending":
      return <Badge variant="secondary">Aguardando pareamento</Badge>;
    case "pending":
      return <Badge variant="secondary">Cadastrado, aguardando</Badge>;
    case "disconnected":
      return <Badge variant="outline">Desconectado</Badge>;
    default:
      return <Badge variant="outline">Não cadastrado</Badge>;
  }
}

function WhatsAppAccordion({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { data, isLoading } = useMyWhatsApp();
  const instance = data?.instance;
  const status = instance?.status;

  return (
    <div className="rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">Meu WhatsApp</span>
        {statusBadge(status)}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t px-4 py-4">
          <p className="text-xs text-muted-foreground">
            O número é cadastrado pelo administrador e pareado direto na
            NextTrack. Aqui você vê o status atual e o telefone vinculado.
          </p>

          {instance?.phone_number && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              Número vinculado:{" "}
              <span className="font-medium">{instance.phone_number}</span>
            </div>
          )}

          {!isLoading && !instance && (
            <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              Peça ao administrador para cadastrar seu número.
            </div>
          )}

          {status === "pending" && (
            <p className="text-xs text-muted-foreground">
              Instância cadastrada. Aguardando o pareamento do QR Code no
              painel NextTrack.
            </p>
          )}

          {status === "disconnected" && (
            <p className="text-xs text-muted-foreground">
              A conexão caiu. Peça ao administrador para reabrir o pareamento
              na NextTrack.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
