"use client";

import { CheckCircle2, Loader2, RefreshCw, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import {
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useMyWhatsApp,
  useRefreshWhatsAppQr,
} from "@/hooks/useMyWhatsApp";

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
      return <Badge variant="secondary">Aguardando QR</Badge>;
    case "pending":
      return <Badge variant="secondary">Iniciando</Badge>;
    case "disconnected":
      return <Badge variant="outline">Desconectado</Badge>;
    default:
      return <Badge variant="outline">Não conectado</Badge>;
  }
}

export function WhatsAppSection() {
  const { data, isLoading } = useMyWhatsApp();
  const connect = useConnectWhatsApp();
  const disconnect = useDisconnectWhatsApp();
  const refresh = useRefreshWhatsAppQr();

  const instance = data?.instance;
  const status = instance?.status;
  const qr = instance?.last_qr_code;

  async function handleConnect() {
    try {
      await connect.mutateAsync();
      notifySuccess("Pareamento iniciado. Escaneie o QR Code com seu WhatsApp.");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Falha ao conectar");
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync();
      notifySuccess("WhatsApp desconectado.");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Falha ao desconectar");
    }
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Smartphone className="h-4 w-4" />
            Meu WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecte seu número para enviar e receber mensagens direto pelo CRM.
            O chat é pessoal: só você vê suas conversas.
          </p>
        </div>
        <div className="shrink-0">{statusBadge(status)}</div>
      </div>

      {instance?.phone_number && status === "connected" && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          Número pareado:{" "}
          <span className="font-medium">{instance.phone_number}</span>
        </div>
      )}

      {status === "qr_pending" && qr && (
        <div className="flex flex-col items-center gap-2 rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            Abra o WhatsApp no celular &rarr; Aparelhos conectados &rarr;
            Conectar um aparelho.
          </p>
          {qr.startsWith("data:") ? (
            <img src={qr} alt="QR Code" className="h-56 w-56" />
          ) : (
            <img
              src={`data:image/png;base64,${qr}`}
              alt="QR Code"
              className="h-56 w-56"
            />
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Atualizar QR
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!instance || status === "disconnected" ? (
          <Button
            type="button"
            onClick={handleConnect}
            disabled={connect.isPending || isLoading}
          >
            {connect.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Conectar WhatsApp
          </Button>
        ) : (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="destructive"
                disabled={disconnect.isPending}
              >
                {disconnect.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Desconectar
              </Button>
            }
            title="Desconectar WhatsApp?"
            description="Você não receberá nem enviará mensagens até parear novamente. Conversas antigas continuam visíveis."
            confirmLabel="Desconectar"
            destructive
            onConfirm={handleDisconnect}
          />
        )}
      </div>
    </section>
  );
}
