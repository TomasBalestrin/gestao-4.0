"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { createLeadSchema } from "@/lib/schemas/lead";
import { cardsKeys } from "@/hooks/useCards";
import type { Lead } from "@/types/domain";
import {
  CustomFieldInput,
  parseCustomFieldsConfig,
} from "@/components/forms/custom-field-input";
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

interface NewCardModalProps {
  etapaId: string;
  onClose: () => void;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as { data?: T } | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data as T;
}

export function NewCardModal({ etapaId, onClose }: NewCardModalProps) {
  const { funilId } = useParams<{ funilId: string }>();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLead, setNewLead] = useState({
    nome: "",
    email: "",
    telefone: "",
    origem: "",
  });
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const funilQuery = useQuery({
    queryKey: ["funil-detail", funilId],
    queryFn: () =>
      getJson<{ custom_fields_schema: unknown }>(`/api/funis/${funilId}`),
  });
  const cfConfig = parseCustomFieldsConfig(funilQuery.data?.custom_fields_schema);

  const leadsQuery = useQuery({
    queryKey: ["leads-search", search],
    queryFn: () =>
      getJson<Lead[]>(
        `/api/leads${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`
      ),
    enabled: mode === "existing",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        etapa_id: etapaId,
        custom_fields: customFields,
      };
      if (mode === "existing") {
        if (!selectedLead) throw new Error("Selecione um lead");
        payload.lead_id = selectedLead.id;
      } else {
        const parsed = createLeadSchema.safeParse(newLead);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "Lead inválido");
        }
        payload.lead = parsed.data;
      }
      const res = await fetch(`/api/funis/${funilId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cardsKeys.byFunil(funilId),
      });
      toast.success("Card criado");
      onClose();
    },
    onError: (err) => setFormError((err as Error).message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo card</DialogTitle>
          <DialogDescription>Vincule um lead e preencha os campos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("existing")}
            >
              Lead existente
            </Button>
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("new")}
            >
              Novo lead
            </Button>
          </div>

          {mode === "existing" ? (
            selectedLead ? (
              <div className="flex items-center justify-between rounded-[10px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-2 text-sm">
                <span className="font-medium">{selectedLead.nome}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Buscar lead por nome, email ou telefone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {(leadsQuery.data ?? []).length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">
                      {leadsQuery.isLoading ? "Buscando..." : "Nenhum lead."}
                    </p>
                  ) : (
                    (leadsQuery.data ?? []).map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                        onClick={() => setSelectedLead(lead)}
                      >
                        {lead.nome}
                        {lead.telefone ? ` · ${lead.telefone}` : ""}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Nome*</Label>
                <Input
                  value={newLead.nome}
                  onChange={(e) =>
                    setNewLead((s) => ({ ...s, nome: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) =>
                    setNewLead((s) => ({ ...s, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={newLead.telefone}
                  onChange={(e) =>
                    setNewLead((s) => ({ ...s, telefone: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Origem</Label>
                <Input
                  value={newLead.origem}
                  onChange={(e) =>
                    setNewLead((s) => ({ ...s, origem: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          {cfConfig.length > 0 && (
            <div className="space-y-3 border-t pt-3">
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
                    value={customFields[field.id]}
                    onChange={(v) =>
                      setCustomFields((s) => ({ ...s, [field.id]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setFormError(null);
                mutation.mutate();
              }}
            >
              {mutation.isPending ? "Criando..." : "Criar card"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
