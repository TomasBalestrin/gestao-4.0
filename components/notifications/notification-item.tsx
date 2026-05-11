"use client";

import type { Notification } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

interface NotificationItemProps {
  notification: Notification;
  onClick: (n: Notification) => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const unread = notification.read_at === null;
  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={cn(
        "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
        unread && "bg-secondary/40"
      )}
    >
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          unread ? "bg-foreground" : "bg-transparent"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-tight">
          {notification.titulo}
        </span>
        {notification.descricao && (
          <span className="block truncate text-xs text-muted-foreground">
            {notification.descricao}
          </span>
        )}
        <span className="block text-[10px] text-muted-foreground/70">
          {relativeTime(notification.created_at)}
        </span>
      </span>
    </button>
  );
}
