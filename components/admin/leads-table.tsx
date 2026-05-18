"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";

import {
  FUNIL_ORIGEM_OPTIONS,
  PRODUTO_OFERTADO_OPTIONS,
} from "@/lib/constants/lead-options";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import type { Lead } from "@/types/domain";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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

interface SdrOption {
  id: string;
  nome: string;
}

interface LeadsResponse {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
}

const ALL = "__all__";

async function fetchLeads(params: URLSearchParams): Promise<LeadsResponse> {
  const url = `/api/leads${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: LeadsResponse }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data ?? { items: [], total: 0, limit: 50, offset: 0 };
}

async function fetchSdrs(): Promise<SdrOption[]> {
  const res = await fetch("/api/users/sdrs");
  const body = (await res.json().catch(() => null)) as
    | { data?: SdrOption[] }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data ?? [];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export function LeadsTable() {
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [funilOrigem, setFunilOrigem] = useState<string>(ALL);
  const [sdrId, setSdrId] = useState<string>(ALL);
  const [produto, setProduto] = useState<string>(ALL);

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (funilOrigem !== ALL) params.set("funil_origem", funilOrigem);
  if (sdrId !== ALL) params.set("sdr_id", sdrId);
  if (produto !== ALL) params.set("produto_ofertado", produto);

  const queryKey = ["admin-leads", params.toString()];
  const leadsQuery = useQuery({
    queryKey,
    queryFn: () => fetchLeads(params),
  });

  const sdrsQuery = useQuery({
    queryKey: ["sdrs"],
    queryFn: fetchSdrs,
    staleTime: 60_000,
  });

  const sdrNameById = new Map(
    (sdrsQuery.data ?? []).map((s) => [s.id, s.nome])
  );

  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`/api/leads/${leadId}?hard=true`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      notifySuccess("Lead excluído");
    },
    onError: (err) => notifyError((err as Error).message),
  });

  const items = leadsQuery.data?.items ?? [];
  const total = leadsQuery.data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="q">Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              id="q"
              placeholder="Nome, email ou telefone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Funil de Origem</Label>
          <Select value={funilOrigem} onValueChange={setFunilOrigem}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {FUNIL_ORIGEM_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>SDR</Label>
          <Select value={sdrId} onValueChange={setSdrId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {(sdrsQuery.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Produto Ofertado</Label>
          <Select value={produto} onValueChange={setProduto}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {PRODUTO_OFERTADO_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {leadsQuery.isLoading
          ? "Carregando..."
          : `${total} lead${total === 1 ? "" : "s"} encontrado${
              total === 1 ? "" : "s"
            }`}
      </p>

      <div className="overflow-x-auto rounded-md border border-[color:var(--border-rgba)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-elevated)] text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <tr>
              <th className="px-3 py-2.5">Nome</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">Telefone</th>
              <th className="px-3 py-2.5">Funil Origem</th>
              <th className="px-3 py-2.5">SDR</th>
              <th className="px-3 py-2.5">Produto</th>
              <th className="px-3 py-2.5">Criado em</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !leadsQuery.isLoading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-text-muted"
                >
                  Nenhum lead encontrado com esses filtros.
                </td>
              </tr>
            )}
            {items.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-[color:var(--hairline)]"
              >
                <td className="px-3 py-2.5 font-medium">{lead.nome}</td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {lead.email ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {lead.telefone ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {lead.funil_origem ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {lead.sdr_id ? sdrNameById.get(lead.sdr_id) ?? "—" : "—"}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {lead.produto_ofertado ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {formatDate(lead.created_at)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ConfirmDialog
                    title={`Excluir "${lead.nome}"?`}
                    description="Esta ação é permanente. O lead, seus cards, calls agendadas e vendas registradas serão removidos do sistema. Não há como desfazer."
                    confirmLabel="Excluir permanentemente"
                    destructive
                    onConfirm={() => deleteLead.mutate(lead.id)}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Excluir lead ${lead.nome}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
