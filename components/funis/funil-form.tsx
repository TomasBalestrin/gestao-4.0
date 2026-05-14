"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { z } from "zod";

import {
  createFunilSchema,
  userRoleSchema,
  type UserRoleValue,
} from "@/lib/schemas/funil";
import {
  customFieldsSchemaSchema,
  type CustomFieldConfig,
} from "@/lib/schemas/custom-fields";
import { UNIVERSAL_FIELDS } from "@/lib/schemas/universal-fields";
import type { Funil } from "@/types/domain";
import { funisKeys } from "@/hooks/useFunis";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { pastelByIndex } from "@/lib/utils/etapa-style";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleSelect } from "@/components/forms/role-select";
import { makeEtapaKey, type EtapaDraft } from "@/components/funis/etapa-list";
import { EtapaKanbanDraft } from "@/components/funis/etapa-kanban-draft";
import { FunilAcessos } from "@/components/funis/funil-acessos";

const baseFormSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(80),
  cor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use hex)"),
  role_alvo: userRoleSchema,
});
type BaseFormValues = z.infer<typeof baseFormSchema>;

interface FunilFormProps {
  mode: "create" | "edit";
  funil?: Funil;
  etapasSection?: React.ReactNode;
}

function parseCustomFields(value: unknown): CustomFieldConfig[] {
  const parsed = customFieldsSchemaSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
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
      cor: funil?.cor ?? "#A1A1A1",
      role_alvo: (funil?.role_alvo as UserRoleValue) ?? undefined,
    },
  });

  const [etapas, setEtapas] = useState<EtapaDraft[]>(() => [
    { key: makeEtapaKey(), nome: "Novo lead", cor: pastelByIndex(0) },
    { key: makeEtapaKey(), nome: "Em conversa", cor: pastelByIndex(1) },
  ]);
  const [enabledFieldIds, setEnabledFieldIds] = useState<string[]>(() =>
    parseCustomFields(funil?.custom_fields_schema).map((f) => f.id)
  );
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

  function onSubmit(base: BaseFormValues) {
    setFormError(null);

    // custom_fields_schema = subconjunto dos universais marcados; mantém o
    // pipeline de validação dinâmica do server (buildCustomFieldsSchema).
    const enabledFields = UNIVERSAL_FIELDS.filter((f) =>
      enabledFieldIds.includes(f.id)
    );

    if (mode === "create") {
      const payload = {
        ...base,
        custom_fields_schema: enabledFields,
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
      mutation.mutate({ ...base, custom_fields_schema: enabledFields });
    }
  }

  function toggleField(id: string) {
    setEnabledFieldIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  const corValue = watch("cor");

  const dadosFields = (
    <div className="grid max-w-3xl items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
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
      <div className="space-y-2">
        <Label htmlFor="cor">Cor</Label>
        <input
          id="cor"
          type="color"
          value={corValue}
          onChange={(e) => setValue("cor", e.target.value)}
          className="h-10 w-16 cursor-pointer rounded border bg-background"
        />
      </div>
    </div>
  );

  const camposFields = (
    <div className="max-w-3xl space-y-3">
      <p className="text-xs text-muted-foreground">
        Marque quais campos universais este funil pode preencher. Campos
        ad-hoc continuam podendo ser adicionados em cada card pelo ícone +.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {UNIVERSAL_FIELDS.map((field) => {
          const checked = enabledFieldIds.includes(field.id);
          return (
            <label
              key={field.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border bg-card p-2 text-sm hover:border-foreground/30"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={checked}
                onChange={() => toggleField(field.id)}
              />
              <span className="font-medium">{field.nome}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending
          ? "Salvando..."
          : mode === "create"
            ? "Criar funil"
            : "Salvar alterações"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => router.push("/admin/funis")}
      >
        Cancelar
      </Button>
      {mode === "edit" && funil && (
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
              className="ml-auto text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {deleteMutation.isPending ? "Excluindo..." : "Excluir funil"}
            </Button>
          }
        />
      )}
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

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Campos do funil
          </h2>
          {camposFields}
        </section>

        {formError && (
          <p className="max-w-3xl text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        {actions}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
          <TabsTrigger value="acessos">Acessos</TabsTrigger>
          <TabsTrigger value="campos">Campos</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          {dadosFields}
        </TabsContent>

        <TabsContent value="etapas" className="space-y-6">
          {etapasSection}
        </TabsContent>

        <TabsContent value="acessos" className="space-y-3">
          {funil && (
            <>
              <p className="text-xs text-muted-foreground">
                Marque os usuários que terão acesso a este funil. Eles passam a
                ver os cards no CRM e, no caso de closers, podem ser
                agendados.
              </p>
              <FunilAcessos funilId={funil.id} />
            </>
          )}
        </TabsContent>

        <TabsContent value="campos" className="space-y-6">
          {camposFields}
        </TabsContent>
      </Tabs>

      {formError && (
        <p className="max-w-3xl text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      {actions}
    </form>
  );
}
