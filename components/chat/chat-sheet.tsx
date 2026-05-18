"use client";

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useChatStore } from "@/lib/stores/chatStore";
import { useChatMessages, useMarkChatRead } from "@/hooks/useChat";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";

export function ChatSheet() {
  const leadId = useChatStore((s) => s.openChatLeadId);
  const closeChat = useChatStore((s) => s.closeChat);
  const { role } = useCurrentUser();
  const { data, isLoading } = useChatMessages(leadId);
  const markRead = useMarkChatRead(leadId ?? "");
  useRealtimeChat(leadId);

  useEffect(() => {
    if (!leadId) return;
    if (role === "admin") return;
    if ((data?.thread?.unread_count ?? 0) > 0) {
      void markRead.mutateAsync().catch(() => undefined);
    }
  }, [leadId, role, data?.thread?.unread_count, markRead]);

  const open = leadId !== null;
  const leadNome = data?.lead?.nome ?? "Conversa";
  const leadTel = data?.lead?.telefone ?? "";
  const canSend = !!data?.can_send && role !== "admin";
  const disabledHint =
    role === "admin"
      ? "Modo somente leitura (admin)."
      : "Conecte seu WhatsApp em Perfil para enviar mensagens.";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeChat()}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="shrink-0 border-b p-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            {leadNome}
          </SheetTitle>
          {leadTel && (
            <p className="text-xs text-muted-foreground">{leadTel}</p>
          )}
        </SheetHeader>

        <MessageList
          messages={data?.messages ?? []}
          isLoading={isLoading}
          emptyHint={
            role === "admin"
              ? "Este lead ainda não tem conversa registrada."
              : canSend
                ? "Sem mensagens ainda. Envie a primeira abaixo."
                : "Sem mensagens ainda."
          }
        />

        {leadId && (
          <MessageComposer
            leadId={leadId}
            disabled={!canSend}
            disabledHint={disabledHint}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
