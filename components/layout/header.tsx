import { Search } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

interface HeaderProps {
  nome: string;
  email: string;
  fotoUrl: string | null;
  breadcrumb?: React.ReactNode;
}

export function Header({ nome, email, fotoUrl, breadcrumb }: HeaderProps) {
  return (
    <header className="relative flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground focus-visible:not-sr-only focus-visible:absolute focus-visible:left-2 focus-visible:top-2 focus-visible:z-50"
      >
        Pular para o conteúdo
      </a>

      <div className="min-w-0 flex-1">
        {breadcrumb ?? (
          <span className="text-sm font-medium text-muted-foreground">
            Gestão 4.0
          </span>
        )}
      </div>

      <div className="hidden flex-1 items-center md:flex">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            disabled
            aria-label="Buscar (em breve)"
            placeholder="Buscar (em breve)"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-muted-foreground placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu nome={nome} email={email} fotoUrl={fotoUrl} />
      </div>
    </header>
  );
}
