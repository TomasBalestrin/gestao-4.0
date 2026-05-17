"use client";

import { AlertTriangle, FileText } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { ChatMessageWithMedia } from "@/types/domain";

export type MessageBubbleVariant = "default" | "whatsapp";

interface MessageBubbleProps {
  message: ChatMessageWithMedia;
  variant?: MessageBubbleVariant;
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

export function MessageBubble({
  message,
  variant = "default",
}: MessageBubbleProps) {
  const isMine = message.from_me;
  const failed = !!message.failed_reason;
  const align = isMine ? "items-end" : "items-start";
  const isWhatsapp = variant === "whatsapp";
  const bubble = cn(
    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
    isWhatsapp
      ? isMine
        ? "bg-[#d9fdd3] text-[#111b21] rounded-br-sm dark:bg-[#005c4b] dark:text-white"
        : "bg-white text-[#111b21] rounded-bl-sm dark:bg-[#202c33] dark:text-white"
      : isMine
        ? "bg-primary text-primary-foreground rounded-br-sm"
        : "bg-muted text-foreground rounded-bl-sm",
    failed && "border border-destructive/50"
  );

  return (
    <div className={cn("flex w-full flex-col", align)}>
      <div className={bubble}>
        <MessageContent message={message} />
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px] opacity-70",
            isMine ? "justify-end" : "justify-start"
          )}
        >
          {failed && (
            <span className="inline-flex items-center gap-0.5 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              falhou
            </span>
          )}
          <span>{formatTime(message.wa_timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ message }: { message: ChatMessageWithMedia }) {
  const url = message.media_signed_url;
  switch (message.content_type) {
    case "text":
      return <p className="whitespace-pre-wrap break-words">{message.text}</p>;
    case "image":
      return (
        <div className="space-y-1">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={message.text ?? "Imagem"}
                className="max-h-64 max-w-full rounded-md object-cover"
              />
            </a>
          ) : (
            <p className="italic opacity-80">[imagem indisponível]</p>
          )}
          {message.text && (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          )}
        </div>
      );
    case "audio":
      return url ? (
        <audio controls src={url} className="max-w-full" />
      ) : (
        <p className="italic opacity-80">[áudio indisponível]</p>
      );
    case "video":
      return url ? (
        <video controls src={url} className="max-h-64 max-w-full rounded-md" />
      ) : (
        <p className="italic opacity-80">[vídeo indisponível]</p>
      );
    case "document":
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
        >
          <FileText className="h-4 w-4" />
          {message.text || "Documento"}
        </a>
      ) : (
        <p className="italic opacity-80">[documento indisponível]</p>
      );
    case "sticker":
      return url ? (
        <img src={url} alt="sticker" className="h-24 w-24 object-contain" />
      ) : (
        <p className="italic opacity-80">[sticker]</p>
      );
    case "location":
      return <p className="italic opacity-80">[localização compartilhada]</p>;
    default:
      return <p className="italic opacity-80">[mensagem não suportada]</p>;
  }
}
