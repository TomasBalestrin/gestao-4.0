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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  EMPTY_LEAD,
  LeadFormFields,
  leadStateToPayload,
  type LeadFormState,
} from "@/components/kanban/lead-form-fields";

interface NewCardModalProps {
  // null = sem etapa explicita (server escolhe a 1a etapa do funil).
  etapaId: string | null;
  onClose: () => void;
}

interface LeadsListResponse {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
}

async function fetchLeads(q: string): Promise<Lead[]> {
  const url = `/api/leads${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`;
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: LeadsListResponse }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data?.items ?? [];
}

export function NewCardModal({ etapaId, onClose }: NewCardModalProps) {
  const { funilId } = useParams<{ funilId: string }>();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLead, setNewLead] = useState<LeadFormState>(EMPTY_LEAD);
  const [formError, setFormError] = useState<string | null>(null);

  const leadsQuery = useQuery({
    queryKey: ["leads-search", search],
    queryFn: () => fetchLeads(search),
    enabled: mode === "existing",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      if (etapaId) payload.etapa_id = etapaId;
      if (mode === "existing") {
        if (!selectedLead) throw new Error("Selecione um lead");
        payload.lead_id = selectedLead.id;
      } else {
        if (!newLead.nome.trim()) {
          throw new Error("Informe o nome");
        }
        if (!newLead.telefone.trim()) {
          throw new Error("Informe o telefone");
        }
        const leadPayload = leadStateToPayload(newLead);
        const parsed = createLeadSchema.safeParse(leadPayload);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo cliente / Lead</DialogTitle>
          <DialogDescription>
            Selecione um lead existente ou cadastre um novo.
          </DialogDescription>
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
              <div className="flex items-center justify-between rounded-md border bg-card p-2 text-sm">
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
            <LeadFormFields
              value={newLead}
              onChange={(patch) => setNewLead((s) => ({ ...s, ...patch }))}
              compact
            />
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
