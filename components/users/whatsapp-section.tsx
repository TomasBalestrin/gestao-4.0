"use client";

import { CheckCircle2, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useMyWhatsApp } from "@/hooks/useMyWhatsApp";

function statusBadge(status: string | undefined) {
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

export function WhatsAppSection() {
  const { data, isLoading } = useMyWhatsApp();
  const instance = data?.instance;
  const status = instance?.status;

  return (
    <section className="space-y-4 rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Smartphone className="h-4 w-4" />
            Meu WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            O número é cadastrado pelo administrador e pareado direto na
            NextTrack. Aqui você vê o status atual e o telefone vinculado.
          </p>
        </div>
        <div className="shrink-0">{statusBadge(status)}</div>
      </div>

      {instance?.phone_number && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          Número vinculado:{" "}
          <span className="font-medium">{instance.phone_number}</span>
        </div>
      )}

      {!isLoading && !instance && (
        <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
          Peça ao administrador para cadastrar seu número.
        </div>
      )}

      {status === "pending" && (
        <p className="text-xs text-muted-foreground">
          Instância cadastrada. Aguardando o pareamento do QR Code no painel
          NextTrack.
        </p>
      )}

      {status === "disconnected" && (
        <p className="text-xs text-muted-foreground">
          A conexão caiu. Peça ao administrador para reabrir o pareamento na
          NextTrack.
        </p>
      )}
    </section>
  );
}
