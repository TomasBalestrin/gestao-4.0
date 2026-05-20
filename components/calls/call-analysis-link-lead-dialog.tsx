"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import type { Lead } from "@/types/domain";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLinkCallAnalysisToLead } from "@/hooks/useCallAnalyses";

interface Props {
  analysisId: string;
  closerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeadsListResponse {
  items: Lead[];
  total: number;
}

async function fetchLeads(q: string): Promise<LeadsListResponse> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  params.set("limit", "20");
  const res = await fetch(`/api/leads?${params.toString()}`);
  const body = (await res.json()) as { data?: LeadsListResponse; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
  return body.data ?? { items: [], total: 0 };
}

export function CallAnalysisLinkLeadDialog({
  analysisId,
  open,
  onOpenChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const link = useLinkCallAnalysisToLead();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      fetchLeads(search)
        .then((r) => setResults(r.items))
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, open]);

  const handleSelect = async (lead: Lead) => {
    try {
      await link.mutateAsync({ id: analysisId, lead_id: lead.id });
      toast.success(`Vinculada a ${lead.nome}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular a um lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              </div>
            ) : results.length === 0 ? (
              <p className="p-6 text-center text-sm text-text-muted">
                Nenhum lead encontrado.
              </p>
            ) : (
              results.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => handleSelect(lead)}
                  disabled={link.isPending}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{lead.nome}</div>
                    <div className="truncate text-xs text-text-muted">
                      {lead.email ?? lead.telefone ?? "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    tabIndex={-1}
                  >
                    <span>Vincular</span>
                  </Button>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
