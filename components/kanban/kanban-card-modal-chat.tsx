"use client";

import { useEffect } from "react";

import { useChatMessages, useMarkChatRead } from "@/hooks/useChat";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface KanbanCardModalChatProps {
  leadId: string;
  active: boolean;
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function KanbanCardModalChat({
  leadId,
  active,
}: KanbanCardModalChatProps) {
  const { role } = useCurrentUser();
  const enabledLeadId = active ? leadId : null;
  const { data, isLoading } = useChatMessages(enabledLeadId);
  const markRead = useMarkChatRead(leadId);
  useRealtimeChat(enabledLeadId);

  useEffect(() => {
    if (!active) return;
    if (role === "admin") return;
    if ((data?.thread?.unread_count ?? 0) > 0) {
      void markRead.mutateAsync().catch(() => undefined);
    }
  }, [active, role, data?.thread?.unread_count, markRead]);

  const leadNome = data?.lead?.nome ?? "Conversa";
  const leadTel = data?.lead?.telefone ?? "";
  const canSend = !!data?.can_send && role !== "admin";
  const disabledHint =
    role === "admin"
      ? "Modo somente leitura (admin)."
      : "Conecte seu WhatsApp em Perfil para enviar mensagens.";
  const emptyHint =
    role === "admin"
      ? "Este lead ainda não tem conversa registrada."
      : canSend
        ? "Sem mensagens ainda. Envie a primeira abaixo."
        : "Sem mensagens ainda.";

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">
            {initials(leadNome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{leadNome}</p>
          {leadTel && (
            <p className="truncate text-xs text-muted-foreground">{leadTel}</p>
          )}
        </div>
      </div>

      <MessageList
        messages={data?.messages ?? []}
        isLoading={isLoading}
        emptyHint={emptyHint}
      />

      <MessageComposer
        leadId={leadId}
        disabled={!canSend}
        disabledHint={disabledHint}
      />
    </div>
  );
}
