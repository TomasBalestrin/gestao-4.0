"use client";

import { Bell } from "lucide-react";

import { unreadCount, useNotifications } from "@/hooks/useNotifications";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

export function NotificationBell() {
  const { data } = useNotifications();
  const open = useNotificationStore((s) => s.dropdownOpen);
  const setOpen = useNotificationStore((s) => s.setDropdownOpen);

  const unread = unreadCount(data);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificações${unread > 0 ? ` (${unread})` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-medium text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
}
