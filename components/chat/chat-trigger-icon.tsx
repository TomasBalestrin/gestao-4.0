"use client";

import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { useMyWhatsApp } from "@/hooks/useMyWhatsApp";
import { useChatStore } from "@/lib/stores/chatStore";
import { useKanbanStore } from "@/lib/stores/kanbanStore";

interface ChatTriggerIconProps {
  leadId: string;
  hasPhone: boolean;
  // Quando passado, o icone abre o modal do card direto no pane "chat" via
  // kanbanStore. Sem cardId (ex: variant="header" em outros contextos), cai
  // no comportamento legado de abrir o ChatSheet via chatStore.
  cardId?: string;
  variant?: "card" | "header";
  className?: string;
}

export function ChatTriggerIcon({
  leadId,
  cardId,
  hasPhone,
  variant = "card",
  className,
}: ChatTriggerIconProps) {
  const { role } = useCurrentUser();
  const { data } = useMyWhatsApp();
  const openChat = useChatStore((s) => s.openChat);
  const openCard = useKanbanStore((s) => s.openCard);

  if (!hasPhone) return null;
  const canOpen = role === "admin" || data?.instance?.status === "connected";
  if (!canOpen) return null;

  const sizeCls =
    variant === "header" ? "h-8 w-8" : "h-7 w-7";
  const iconCls = variant === "header" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (cardId) {
          openCard(cardId, "chat");
        } else {
          openChat(leadId);
        }
      }}
      aria-label="Abrir conversa WhatsApp"
      title="Abrir conversa WhatsApp"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        sizeCls,
        className
      )}
    >
      <MessageCircle className={iconCls} />
    </button>
  );
}
