"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { z } from "zod";

import {
  createFunilSchema,
  userRoleSchema,
  type UserRoleValue,
} from "@/lib/schemas/funil";
import type { Funil } from "@/types/domain";
import { funisKeys } from "@/hooks/useFunis";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { pastelByIndex } from "@/lib/utils/etapa-style";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleSelect } from "@/components/forms/role-select";
import { makeEtapaKey, type EtapaDraft } from "@/components/funis/etapa-list";
import { EtapaKanbanDraft } from "@/components/funis/etapa-kanban-draft";
import { FunilAcessos } from "@/components/funis/funil-acessos";
import { FunilAgendamento } from "@/components/funis/funil-agendamento";

const baseFormSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(80),
  role_alvo: userRoleSchema,
  agenda_call_enabled: z.boolean(),
  funil_destino_id: z.string().nullable(),
  etapa_destino_id: z.string().nullable(),
});
type BaseFormValues = z.infer<typeof baseFormSchema>;

interface FunilFormProps {
  mode: "create" | "edit";
  funil?: Funil;
  etapasSection?: React.ReactNode;
}

export function FunilForm({ mode, funil, etapasSection }: FunilFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BaseFormValues>({
    resolver: zodResolver(baseFormSchema),
    defaultValues: {
      nome: funil?.nome ?? "",
      role_alvo: (funil?.role_alvo as UserRoleValue) ?? undefined,
      agenda_call_enabled: funil?.agenda_call_enabled ?? false,
      funil_destino_id: funil?.funil_destino_id ?? null,
      etapa_destino_id: funil?.etapa_destino_id ?? null,
    },
  });

  const [etapas, setEtapas] = useState<EtapaDraft[]>(() => [
    { key: makeEtapaKey(), nome: "Novo lead", cor: pastelByIndex(0) },
    { key: makeEtapaKey(), nome: "Em conversa", cor: pastelByIndex(1) },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const url = mode === "create" ? "/api/funis" : `/api/funis/${funil!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | { data?: { id: string }; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      return body!.data!;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: funisKeys.all });
      void queryClient.invalidateQueries({
        queryKey: ["funil-detail", data.id],
      });
      toast.success(mode === "create" ? "Funil criado" : "Funil atualizado");
      router.push(`/admin/funis/${data.id}`);
      router.refresh();
    },
    onError: (err) => {
      setFormError((err as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!funil) throw new Error("Funil não carregado");
      const res = await fetch(`/api/funis/${funil.id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: funisKeys.all });
      notifySuccess("Funil excluído");
      router.push("/admin/funis");
      router.refresh();
    },
    onError: (err) => notifyError(`Falha ao excluir: ${(err as Error).message}`),
  });

  function onSubmit(values: BaseFormValues) {
    setFormError(null);

    if (mode === "create") {
      const payload = {
        nome: values.nome,
        role_alvo: values.role_alvo,
        etapas: etapas.map((e) => ({ nome: e.nome, cor: e.cor })),
        usuario_ids: [],
      };
      const parsed = createFunilSchema.safeParse(payload);
      if (!parsed.success) {
        setFormError(
          parsed.error.issues[0]?.message ?? "Dados do funil inválidos."
        );
        return;
      }
      mutation.mutate(parsed.data);
    } else {
      mutation.mutate({
        nome: values.nome,
        role_alvo: values.role_alvo,
        agenda_call_enabled: values.agenda_call_enabled,
        funil_destino_id: values.agenda_call_enabled
          ? values.funil_destino_id
          : null,
        etapa_destino_id: values.agenda_call_enabled
          ? values.etapa_destino_id
          : null,
      });
    }
  }

  const dadosFields = (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register("nome")} />
        {errors.nome && (
          <p className="text-sm text-destructive">{errors.nome.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="role_alvo">Role alvo</Label>
        <RoleSelect
          id="role_alvo"
          value={watch("role_alvo")}
          onChange={(v) => setValue("role_alvo", v, { shouldValidate: true })}
        />
        {errors.role_alvo && (
          <p className="text-sm text-destructive">
            {errors.role_alvo.message}
          </p>
        )}
      </div>
    </div>
  );

  if (mode === "create") {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Dados do funil
          </h2>
          {dadosFields}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Etapas
          </h2>
          <EtapaKanbanDraft value={etapas} onChange={setEtapas} />
        </section>

        {formError && (
          <p className="max-w-3xl text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Criar funil"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/funis")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="geral" className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Voltar"
              onClick={() => router.push("/admin/funis")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          <TabsList className="flex-1">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="etapas">Etapas</TabsTrigger>
            <TabsTrigger value="agendamento">Agendamento</TabsTrigger>
          </TabsList>
          {funil && (
            <ConfirmDialog
              title={`Excluir "${funil.nome}"?`}
              description="Esta ação é permanente: remove o funil e cascateia em etapas, cards, automações e vínculos de usuários. Para apenas desativar sem perder o histórico, use o toggle de Ativo na lista."
              confirmLabel="Excluir definitivamente"
              destructive
              onConfirm={() => deleteMutation.mutate()}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  aria-label="Excluir funil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          )}
        </div>

        <TabsContent value="geral" className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Dados</h3>
            {dadosFields}
          </section>
          {funil && (
            <>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Acessos</h3>
                <p className="text-xs text-muted-foreground">
                  Marque os usuários que terão acesso a este funil. Eles passam
                  a ver os cards no CRM e, no caso de closers, podem ser
                  agendados.
                </p>
                <FunilAcessos funilId={funil.id} />
              </section>
            </>
          )}
        </TabsContent>

        <TabsContent value="etapas" className="space-y-6">
          {etapasSection}
        </TabsContent>

        <TabsContent value="agendamento" className="space-y-3">
          {funil && (
            <FunilAgendamento
              funil={funil}
              enabled={watch("agenda_call_enabled")}
              funilDestinoId={watch("funil_destino_id")}
              etapaDestinoId={watch("etapa_destino_id")}
              onChange={(patch) => {
                if (patch.enabled !== undefined) {
                  setValue("agenda_call_enabled", patch.enabled, {
                    shouldDirty: true,
                  });
                }
                if (patch.funilDestinoId !== undefined) {
                  setValue("funil_destino_id", patch.funilDestinoId, {
                    shouldDirty: true,
                  });
                  setValue("etapa_destino_id", null, { shouldDirty: true });
                }
                if (patch.etapaDestinoId !== undefined) {
                  setValue("etapa_destino_id", patch.etapaDestinoId, {
                    shouldDirty: true,
                  });
                }
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {formError && (
        <p className="max-w-3xl text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}
    </form>
  );
}
