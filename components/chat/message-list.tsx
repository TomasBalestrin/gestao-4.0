"use client";

import { useEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { ChatMessageWithMedia } from "@/types/domain";

interface MessageListProps {
  messages: ChatMessageWithMedia[];
  isLoading: boolean;
  emptyHint?: string;
}

function dayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const isToday =
      d.toDateString() === today.toDateString();
    if (isToday) return "Hoje";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function MessageList({
  messages,
  isLoading,
  emptyHint,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const length = messages.length;
  const lastId = messages[length - 1]?.id;

  useEffect(() => {
    if (!isLoading && length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [isLoading, length, lastId]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-2/3" />
        ))}
      </div>
    );
  }

  if (length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {emptyHint ?? "Sem mensagens ainda."}
      </div>
    );
  }

  const groups = new Map<string, ChatMessageWithMedia[]>();
  for (const msg of messages) {
    const key = dayLabel(msg.wa_timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(msg);
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {Array.from(groups.entries()).map(([day, items]) => (
        <div key={day} className="space-y-2">
          <div className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
            {day}
          </div>
          {items.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      ))}
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}
