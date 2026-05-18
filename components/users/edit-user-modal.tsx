"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Smartphone } from "lucide-react";
import { z } from "zod";

import { cn } from "@/lib/utils/cn";
import { userRoleSchema, type UserRoleValue } from "@/lib/schemas/funil";
import type { User, WaInstance } from "@/types/domain";
import { usersKeys } from "@/components/users/users-table";
import { AvatarUpload } from "@/components/users/avatar-upload";
import { RoleSelect } from "@/components/forms/role-select";
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
import { Switch } from "@/components/ui/switch";

const editSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(120),
  role: userRoleSchema,
  wa_instance_id: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .optional()
    .or(z.literal("")),
  wa_phone_number: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
});
type EditValues = z.infer<typeof editSchema>;

interface EditUserModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body!.data as T;
}

export function EditUserModal({ user, open, onOpenChange }: EditUserModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{user.nome}</DialogTitle>
          <DialogDescription>Editar usuário</DialogDescription>
        </DialogHeader>
        {open && <EditUserBody user={user} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditUserBody({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [fotoUrl, setFotoUrl] = useState<string | null>(user.foto_url);
  const [isActive, setIsActive] = useState(user.is_active);
  const [formError, setFormError] = useState<string | null>(null);
  const [waOpen, setWaOpen] = useState(false);

  const waQuery = useQuery({
    queryKey: ["wa-instance", user.id],
    queryFn: () => getJson<WaInstance | null>(`/api/users/${user.id}/whatsapp`),
  });
  const waInstance = waQuery.data;

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nome: user.nome,
      role: user.role as UserRoleValue,
      wa_instance_id: "",
      wa_phone_number: "",
    },
  });

  useEffect(() => {
    if (waQuery.isLoading) return;
    form.setValue("wa_instance_id", waInstance?.nextapi_instance_id ?? "");
    form.setValue("wa_phone_number", waInstance?.phone_number ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waQuery.isLoading, waInstance?.nextapi_instance_id, waInstance?.phone_number]);

  const editMut = useMutation({
    mutationFn: async (values: EditValues) => {
      const payload: Record<string, unknown> = {
        nome: values.nome,
        role: values.role,
        is_active: isActive,
      };
      if (fotoUrl !== user.foto_url) payload.foto_url = fotoUrl;

      const nextWaId = (values.wa_instance_id ?? "").trim();
      const nextPhone = (values.wa_phone_number ?? "").trim();
      const prevWaId = waInstance?.nextapi_instance_id ?? "";
      const prevPhone = waInstance?.phone_number ?? "";
      if (nextWaId !== prevWaId) payload.wa_instance_id = nextWaId;
      if (nextPhone !== prevPhone) payload.wa_phone_number = nextPhone;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersKeys.all });
      void queryClient.invalidateQueries({
        queryKey: ["wa-instance", user.id],
      });
      toast.success("Usuário atualizado");
      onClose();
    },
    onError: (err) => setFormError((err as Error).message),
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) => {
        setFormError(null);
        editMut.mutate(v);
      })}
      className="mt-4 flex min-h-0 flex-col gap-5 overflow-y-auto px-1"
      noValidate
    >
      <AvatarUpload
        userId={user.id}
        nome={user.nome}
        currentUrl={fotoUrl}
        onUploaded={setFotoUrl}
      />

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
          <Label>Email</Label>
          <Input value={user.email} readOnly disabled />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <RoleSelect
          id="role"
          value={form.watch("role")}
          onChange={(v) => form.setValue("role", v, { shouldValidate: true })}
        />
      </div>

      <label className="flex items-center gap-3 rounded-[10px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Usuário ativo</p>
          <p className="text-xs text-muted-foreground">
            Desativados perdem acesso, mas o histórico é preservado.
          </p>
        </div>
      </label>

      <WhatsAppAccordion
        open={waOpen}
        onToggle={() => setWaOpen((o) => !o)}
        status={waInstance?.status ?? null}
        form={form}
      />

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="mt-2 flex shrink-0 justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={editMut.isPending}>
          {editMut.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

function statusBadge(status: string | null) {
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

interface WhatsAppAccordionProps {
  open: boolean;
  onToggle: () => void;
  status: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
}

function WhatsAppAccordion({
  open,
  onToggle,
  status,
  form,
}: WhatsAppAccordionProps) {
  return (
    <div className="rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">WhatsApp</span>
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
            Cole o <span className="font-mono">instance_id</span> da NextTrack
            e o número (com DDI, ex: 5511999998888). Deixe em branco para
            desvincular.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="wa_instance_id">Instance ID (NextTrack)</Label>
            <Input
              id="wa_instance_id"
              placeholder="ex: 8a9b1f7e-..."
              {...form.register("wa_instance_id")}
            />
            {form.formState.errors.wa_instance_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.wa_instance_id.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa_phone_number">Telefone (com DDI)</Label>
            <Input
              id="wa_phone_number"
              placeholder="ex: 5511999998888"
              {...form.register("wa_phone_number")}
            />
            {form.formState.errors.wa_phone_number && (
              <p className="text-sm text-destructive">
                {form.formState.errors.wa_phone_number.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
