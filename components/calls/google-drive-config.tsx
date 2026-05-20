"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, RefreshCw, Unlink } from "lucide-react";

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
import {
  useDisconnectGoogleDrive,
  useGoogleDriveFolders,
  useGoogleDriveIntegration,
  useSyncCalls,
  useUpdateGoogleDriveConfig,
} from "@/hooks/useGoogleDrive";
import { GoogleDriveKeywordsInput } from "@/components/calls/google-drive-keywords-input";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: {
    label: "Aguardando conexão",
    tone: "text-text-muted",
  },
  connected: { label: "Conectado", tone: "text-emerald-500" },
  disconnected: { label: "Desconectado", tone: "text-text-muted" },
  expired_token: { label: "Token expirado", tone: "text-red-500" },
};

export function GoogleDriveConfig() {
  const { data, isLoading, refetch } = useGoogleDriveIntegration();
  const integration = data?.integration ?? null;
  const isConnected = integration?.status === "connected";

  const foldersQuery = useGoogleDriveFolders(isConnected);
  const updateConfig = useUpdateGoogleDriveConfig();
  const disconnect = useDisconnectGoogleDrive();
  const syncNow = useSyncCalls();

  const [folderId, setFolderId] = useState<string>("");
  const [folderName, setFolderName] = useState<string>("");
  const [keywords, setKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (integration) {
      setFolderId(integration.folder_id ?? "");
      setFolderName(integration.folder_name ?? "");
      setKeywords(integration.file_keywords ?? []);
    }
  }, [integration]);

  const folders = foldersQuery.data?.folders ?? [];
  const selectedFolderName = useMemo(() => {
    if (!folderId) return "";
    const match = folders.find((f) => f.id === folderId);
    return match?.name ?? folderName;
  }, [folderId, folderName, folders]);

  const handleConnect = () => {
    window.location.href = "/api/google/oauth/start";
  };

  const handleSave = async () => {
    if (!folderId) {
      toast.error("Selecione uma pasta do Drive");
      return;
    }
    if (keywords.length === 0) {
      toast.error("Adicione pelo menos 1 palavra-chave");
      return;
    }
    try {
      await updateConfig.mutateAsync({
        folder_id: folderId,
        folder_name: selectedFolderName || null,
        file_keywords: keywords,
      });
      toast.success("Configuração salva");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar o Google Drive?")) return;
    try {
      await disconnect.mutateAsync();
      toast.success("Google Drive desconectado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
    }
  };

  const handleSync = async () => {
    try {
      const res = await syncNow.mutateAsync();
      const s = res.summary;
      toast.success(
        `Sync concluído: ${s.processed} processadas, ${s.matched} vinculadas, ${s.unmatched} sem lead, ${s.failed} falhas`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no sync");
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!integration || integration.status === "disconnected") {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-medium">Conecte seu Google Drive</h2>
        <p className="mt-2 text-sm text-text-muted">
          Após conectar, escolha a pasta onde ficam suas transcrições e o sistema
          começa a analisar as calls automaticamente.
        </p>
        <Button onClick={handleConnect} className="mt-6">
          Conectar Google Drive
        </Button>
      </div>
    );
  }

  const status = STATUS_LABELS[integration.status] ?? STATUS_LABELS.pending!;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-text-muted">Conectado como</div>
            <div className="font-medium">
              {integration.google_email ?? "(sem email)"}
            </div>
            <div className={`mt-1 text-xs ${status.tone}`}>{status.label}</div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
            >
              <Unlink className="h-3.5 w-3.5" />
              Desconectar
            </Button>
          </div>
        </div>
      </section>

      {integration.status === "expired_token" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          O token do Google expirou. Clique em &quot;Conectar Google
          Drive&quot; novamente para reautorizar.
          <div className="mt-3">
            <Button size="sm" onClick={handleConnect}>
              Reconectar
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Configuração da sincronização</h2>

        <div className="space-y-2">
          <Label htmlFor="folder">Pasta no Drive</Label>
          <Select
            value={folderId || undefined}
            onValueChange={(v) => {
              setFolderId(v);
              const f = folders.find((x) => x.id === v);
              setFolderName(f?.name ?? "");
            }}
          >
            <SelectTrigger id="folder">
              <SelectValue
                placeholder={
                  foldersQuery.isLoading
                    ? "Carregando pastas..."
                    : "Selecione a pasta com transcrições"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {folderId && (
            <p className="text-xs text-text-muted">
              ID: <code className="font-mono">{folderId}</code>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Palavras-chave no título do arquivo</Label>
          <GoogleDriveKeywordsInput value={keywords} onChange={setKeywords} />
          <p className="text-xs text-text-muted">
            O sistema processa apenas arquivos cujo nome contém pelo menos uma
            das palavras-chave (case-insensitive). Ex: &quot;Transcrição&quot;,
            &quot;Notes by Gemini&quot;, &quot;Transcript&quot;.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            <Check className="h-3.5 w-3.5" />
            Salvar configuração
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Sincronizar agora</h2>
            <p className="mt-1 text-xs text-text-muted">
              Última sincronização:{" "}
              {integration.last_synced_at
                ? new Date(integration.last_synced_at).toLocaleString("pt-BR")
                : "nunca"}
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncNow.isPending}>
            {syncNow.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronizar
          </Button>
        </div>
      </section>
    </div>
  );
}
