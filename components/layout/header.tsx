import { Search } from "lucide-react";

import { NotificationBell } from "@/components/layout/notification-bell";

interface HeaderProps {
  breadcrumb?: React.ReactNode;
}

export function Header({ breadcrumb }: HeaderProps) {
  return (
    <header className="glass-light sticky top-0 z-sticky flex h-14 shrink-0 items-center gap-4 px-5">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground focus-visible:not-sr-only focus-visible:absolute focus-visible:left-2 focus-visible:top-2 focus-visible:z-50"
      >
        Pular para o conteúdo
      </a>

      <div className="min-w-0 flex-1">
        {breadcrumb ?? (
          <span className="text-[13px] font-medium text-text-secondary">
            Gestão 4.0
          </span>
        )}
      </div>

      <div className="hidden flex-1 items-center md:flex">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            disabled
            aria-label="Buscar (em breve)"
            placeholder="Buscar (em breve)"
            className="h-9 w-full rounded-[9px] border border-[color:var(--border-strong)] bg-transparent pl-9 pr-3 text-[13px] text-text-secondary placeholder:text-text-muted disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
