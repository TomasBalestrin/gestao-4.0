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
    <div className="flex h-full flex-col bg-[#e5ddd5] dark:bg-[#0b141a]">
      <div className="flex shrink-0 items-center gap-3 border-b border-black/10 bg-[#f0f2f5] px-4 py-3 dark:border-white/10 dark:bg-[#202c33]">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-[#dfe5e7] text-xs text-[#54656f] dark:bg-[#2a3942] dark:text-white">
            {initials(leadNome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#111b21] dark:text-white">
            {leadNome}
          </p>
          {leadTel && (
            <p className="truncate text-xs text-[#667781] dark:text-[#8696a0]">
              {leadTel}
            </p>
          )}
        </div>
      </div>

      <MessageList
        messages={data?.messages ?? []}
        isLoading={isLoading}
        emptyHint={emptyHint}
        variant="whatsapp"
      />

      <MessageComposer
        leadId={leadId}
        disabled={!canSend}
        disabledHint={disabledHint}
      />
    </div>
  );
}
