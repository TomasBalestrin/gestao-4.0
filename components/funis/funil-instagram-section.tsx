"use client";

import { Instagram, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IgInstanceResponse {
  id: string;
  funil_id: string;
  ig_user_id: string;
  ig_username: string | null;
  page_id: string;
  status: "pending" | "connected" | "disconnected" | "expired_token";
  token_expires_at: string | null;
  last_connected_at: string | null;
}

interface FunilInstagramSectionProps {
  funilId: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T | null; error?: string }
    | null;
  if (!res.ok) return null;
  return body?.data ?? null;
}

function statusLabel(status: IgInstanceResponse["status"]): {
  label: string;
  tone: "success" | "warning" | "destructive" | "neutral";
} {
  switch (status) {
    case "connected":
      return { label: "Conectado", tone: "success" };
    case "pending":
      return { label: "Pendente", tone: "warning" };
    case "disconnected":
      return { label: "Desconectado", tone: "neutral" };
    case "expired_token":
      return { label: "Token expirado", tone: "destructive" };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function FunilInstagramSection({ funilId }: FunilInstagramSectionProps) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ig-instance", funilId],
    queryFn: () => getJson<IgInstanceResponse>(`/api/instagram/instances/${funilId}`),
    staleTime: 30_000,
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/instances/${funilId}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      notifySuccess("Instagram desconectado");
      void qc.invalidateQueries({ queryKey: ["ig-instance", funilId] });
    },
    onError: (err) => notifyError(`Falha: ${(err as Error).message}`),
  });

  function handleConnect() {
    window.location.href = `/api/instagram/oauth/start?funilId=${funilId}`;
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando status...
      </div>
    );
  }

  const inst = query.data;
  const isConnected = inst?.status === "connected";

  if (!inst) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-xs text-muted-foreground">
          Conecte uma conta Instagram empresarial ao funil. Quando um lead
          mandar DM, a plataforma cria um card aqui automaticamente. Qualquer
          membro do funil pode responder.
        </p>
        <Button type="button" onClick={handleConnect}>
          <Instagram className="size-4" />
          Conectar Instagram
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Voce precisa estar logado como admin no Facebook que administra a
          conta IG empresarial. Confira o guia em <code>docs/instagram-setup.md</code>.
        </p>
      </div>
    );
  }

  const { tone, label } = statusLabel(inst.status);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-4">
        <Instagram className="size-5 text-[color:var(--text-secondary)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {inst.ig_username ? `@${inst.ig_username}` : "Conta Instagram"}
          </p>
          <p className="text-xs text-muted-foreground">
            Conectado em {formatDate(inst.last_connected_at)} · Token expira{" "}
            {formatDate(inst.token_expires_at)}
          </p>
        </div>
        <Badge
          variant={
            tone === "success"
              ? "default"
              : tone === "destructive"
                ? "destructive"
                : "outline"
          }
        >
          {label}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isConnected && (
          <Button type="button" onClick={handleConnect}>
            <Instagram className="size-4" />
            Reconectar
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
        >
          {disconnect.isPending ? "Desconectando..." : "Desconectar"}
        </Button>
      </div>

      {inst.status === "expired_token" && (
        <p className="text-xs text-[color:var(--danger-color)]">
          O token de 60 dias expirou e o refresh falhou. Clique em
          &quot;Reconectar&quot; pra refazer o OAuth.
        </p>
      )}
    </div>
  );
}
