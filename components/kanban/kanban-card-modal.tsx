"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cardsKeys, type KanbanCardData } from "@/hooks/useCards";
import { useKanbanStore } from "@/lib/stores/kanbanStore";
import {
  CustomFieldInput,
  parseCustomFieldsConfig,
} from "@/components/forms/custom-field-input";
import { AutomationErrorBanner } from "@/components/kanban/automation-error-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface KanbanCardModalProps {
  card: KanbanCardData;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

export function KanbanCardModal({ card }: KanbanCardModalProps) {
  const selectedCardId = useKanbanStore((s) => s.selectedCardId);
  const closeCard = useKanbanStore((s) => s.closeCard);
  const queryClient = useQueryClient();
  const open = selectedCardId === card.id;

  const funilQuery = useQuery({
    queryKey: ["funil-detail", card.funil_id],
    queryFn: () =>
      getJson<{ custom_fields_schema: unknown }>(
        `/api/funis/${card.funil_id}`
      ),
    enabled: open,
  });
  const cfConfig = parseCustomFieldsConfig(funilQuery.data?.custom_fields_schema);

  const [values, setValues] = useState<Record<string, unknown>>(
    () => (card.custom_fields as Record<string, unknown>) ?? {}
  );
  useEffect(() => {
    if (open) {
      setValues((card.custom_fields as Record<string, unknown>) ?? {});
    }
  }, [open, card.custom_fields]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_fields: values }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cardsKeys.byFunil(card.funil_id),
      });
      toast.success("Card atualizado");
    },
    onError: (err) => toast.error(`Falha ao salvar: ${(err as Error).message}`),
  });

  const lead = card.lead;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeCard()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{lead.nome}</SheetTitle>
          <SheetDescription>
            {card.etapa ? card.etapa.nome : "Card"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="detalhes" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="detalhes" className="flex-1">
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex-1">
              Calls
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex-1">
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="space-y-4">
            <AutomationErrorBanner
              cardId={card.id}
              funilId={card.funil_id}
            />
            <div className="space-y-1 rounded-md border bg-card p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Lead: </span>
                {lead.nome}
              </p>
              {lead.email && (
                <p>
                  <span className="text-muted-foreground">Email: </span>
                  {lead.email}
                </p>
              )}
              {lead.telefone && (
                <p>
                  <span className="text-muted-foreground">Telefone: </span>
                  {lead.telefone}
                </p>
              )}
              {lead.origem && (
                <p>
                  <span className="text-muted-foreground">Origem: </span>
                  {lead.origem}
                </p>
              )}
              {card.assigned && (
                <p>
                  <span className="text-muted-foreground">Responsável: </span>
                  {card.assigned.nome}
                </p>
              )}
            </div>

            {cfConfig.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Campos do funil
                </p>
                {cfConfig.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs">
                      {field.nome}
                      {field.obrigatorio && " *"}
                    </Label>
                    <CustomFieldInput
                      field={field}
                      value={values[field.id]}
                      onChange={(v) =>
                        setValues((s) => ({ ...s, [field.id]: v }))
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? "Salvando..." : "Salvar campos"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calls">
            <p className="py-8 text-center text-sm text-muted-foreground">
              Agendamento de calls — em breve.
            </p>
          </TabsContent>

          <TabsContent value="historico">
            <p className="py-8 text-center text-sm text-muted-foreground">
              Histórico do card — em breve.
            </p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
