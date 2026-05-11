"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import type { Funil } from "@/types/domain";
import { funisKeys } from "@/hooks/useFunis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RoleSelect } from "@/components/forms/role-select";
import { EtapaList, makeEtapaKey, type EtapaDraft } from "@/components/funis/etapa-list";
import { CustomFieldsBuilder } from "@/components/funis/custom-fields-builder";

const baseFormSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(80),
  cor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use hex)"),
  descricao: z.string().max(500).optional().nullable(),
  role_alvo: userRoleSchema,
});
type BaseFormValues = z.infer<typeof baseFormSchema>;

interface FunilFormProps {
  mode: "create" | "edit";
  funil?: Funil;
}

function parseCustomFields(value: unknown): CustomFieldConfig[] {
  const parsed = customFieldsSchemaSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function FunilForm({ mode, funil }: FunilFormProps) {
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
      descricao: funil?.descricao ?? "",
      role_alvo: (funil?.role_alvo as UserRoleValue) ?? undefined,
    },
  });

  const [etapas, setEtapas] = useState<EtapaDraft[]>(() => [
    { key: makeEtapaKey(), nome: "Novo lead", cor: "#525252" },
    { key: makeEtapaKey(), nome: "Em conversa", cor: "#A1A1A1" },
  ]);
  const [customFields, setCustomFields] = useState<CustomFieldConfig[]>(() =>
    parseCustomFields(funil?.custom_fields_schema)
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

  function onSubmit(base: BaseFormValues) {
    setFormError(null);

    const cfParsed = customFieldsSchemaSchema.safeParse(customFields);
    if (!cfParsed.success) {
      setFormError("Revise os campos customizados.");
      return;
    }

    if (mode === "create") {
      const payload = {
        ...base,
        custom_fields_schema: cfParsed.data,
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
      mutation.mutate({ ...base, custom_fields_schema: cfParsed.data });
    }
  }

  const corValue = watch("cor");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dados do funil
        </h2>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" {...register("nome")} />
          {errors.nome && (
            <p className="text-sm text-destructive">{errors.nome.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" rows={2} {...register("descricao")} />
        </div>
        <div className="flex gap-6">
          <div className="space-y-2">
            <Label htmlFor="cor">Cor</Label>
            <input
              id="cor"
              type="color"
              value={corValue}
              onChange={(e) => setValue("cor", e.target.value)}
              className="h-9 w-16 cursor-pointer rounded border bg-background"
            />
          </div>
          <div className="flex-1 space-y-2">
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
      </section>

      {mode === "create" && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Etapas
          </h2>
          <EtapaList value={etapas} onChange={setEtapas} />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Campos customizados
        </h2>
        <CustomFieldsBuilder value={customFields} onChange={setCustomFields} />
      </section>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="flex gap-2">
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
      </div>
    </form>
  );
}
