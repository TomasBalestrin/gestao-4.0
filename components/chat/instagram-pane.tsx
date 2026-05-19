"use client";

import { useEffect, useRef, useState } from "react";
import { Instagram, Send, AlertTriangle } from "lucide-react";

import { useIgMessages, useSendIgMessage } from "@/hooks/useInstagramChat";
import { useRealtimeInstagram } from "@/hooks/useRealtimeInstagram";
import { notifyError } from "@/lib/utils/notify";
import { cn } from "@/lib/utils/cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InstagramWindowCountdown } from "@/components/chat/instagram-window-countdown";

interface InstagramPaneProps {
  leadId: string;
  leadNome: string;
  active: boolean;
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function dayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Hoje";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
    }).format(d);
  } catch {
    return "";
  }
}

export function InstagramPane({ leadId, leadNome, active }: InstagramPaneProps) {
  const enabled = active ? leadId : null;
  const { data, isLoading } = useIgMessages(enabled);
  useRealtimeInstagram(enabled);

  const send = useSendIgMessage(leadId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messages = data?.messages ?? [];
  const thread = data?.thread ?? null;
  const canSend = !!data?.can_send;
  const len = messages.length;
  const lastId = messages[len - 1]?.id;

  useEffect(() => {
    if (!isLoading && len > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [isLoading, len, lastId]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    send
      .mutateAsync(trimmed)
      .then(() => setText(""))
      .catch((err) => notifyError((err as Error).message));
  }

  const username = thread?.ig_sender_username;
  const headerSubtitle = username ? `@${username}` : "Instagram Direct";

  // Agrupa mensagens por dia.
  const groups = new Map<string, typeof messages>();
  for (const m of messages) {
    const key = dayLabel(m.ig_timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
            <Instagram className="size-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{leadNome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {headerSubtitle}
          </p>
        </div>
        <InstagramWindowCountdown expiresAt={thread?.window_expires_at ?? null} />
      </div>

      {isLoading ? (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-2/3" />
          ))}
        </div>
      ) : len === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Sem mensagens ainda. No Instagram, a conversa precisa comecar pelo
          lead.
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {Array.from(groups.entries()).map(([day, items]) => (
            <div key={day} className="space-y-2">
              <div className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
                {day}
              </div>
              {items.map((m) => {
                const failed = !!m.failed_reason;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex w-full flex-col",
                      m.from_me ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        m.from_me
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm",
                        failed && "border border-destructive/50"
                      )}
                    >
                      {m.content_type === "text" ? (
                        <p className="whitespace-pre-wrap break-words">
                          {m.text}
                        </p>
                      ) : m.content_type === "image" && m.media_url ? (
                        <a
                          href={m.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={m.media_url}
                            alt={m.text ?? "Imagem"}
                            loading="lazy"
                            decoding="async"
                            className="max-h-64 max-w-full rounded-md object-cover"
                          />
                        </a>
                      ) : (
                        <p className="italic opacity-80">
                          [{m.content_type}
                          {m.text ? `: ${m.text}` : ""}]
                        </p>
                      )}
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-1 text-[10px] opacity-70",
                          m.from_me ? "justify-end" : "justify-start"
                        )}
                      >
                        {failed && (
                          <span className="inline-flex items-center gap-0.5 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            falhou
                          </span>
                        )}
                        <span>{formatTime(m.ig_timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} aria-hidden />
        </div>
      )}

      <div className="shrink-0 border-t bg-muted/20 p-3">
        {canSend ? (
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={send.isPending}
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={send.isPending || !text.trim()}
              size="icon"
              aria-label="Enviar"
            >
              <Send className="size-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {!thread
              ? "Sem conversa aberta com esse lead no Instagram."
              : thread.window_expires_at &&
                  new Date(thread.window_expires_at).getTime() <= Date.now()
                ? "Janela de 24h fechada. So volta a abrir quando o lead responder."
                : "Envio indisponivel. Verifique a conexao do Instagram do funil."}
          </p>
        )}
      </div>
    </div>
  );
}
