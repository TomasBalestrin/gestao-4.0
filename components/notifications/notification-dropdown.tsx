"use client";

import { useRouter } from "next/navigation";

import type { Notification } from "@/types/domain";
import {
  unreadCount,
  useMarkNotificationsRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-item";

export function NotificationDropdown() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const setOpen = useNotificationStore((s) => s.setDropdownOpen);

  const items = data ?? [];
  const unread = unreadCount(items);

  function handleClick(n: Notification) {
    if (n.read_at === null) markRead.mutate({ ids: [n.id] });
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="w-80">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Notificações</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={unread === 0 || markRead.isPending}
          onClick={() => markRead.mutate({ all: true })}
        >
          Marcar todas
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Carregando...
          </p>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação.
          </p>
        ) : (
          items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
