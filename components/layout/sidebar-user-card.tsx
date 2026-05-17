"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { useProfileStore } from "@/lib/stores/profileStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarUserCardProps {
  collapsed: boolean;
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarUserCard({ collapsed }: SidebarUserCardProps) {
  const router = useRouter();
  const { nome, email, fotoUrl } = useCurrentUser();
  const openProfile = useProfileStore((s) => s.openProfile);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu do usuário"
        className={cn(
          "group flex w-full items-center gap-2 rounded-md p-2 ring-offset-background transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          collapsed && "justify-center"
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
          <AvatarFallback className="text-xs">
            {initials(nome) || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {nome}
            </span>
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-medium">{nome}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openProfile()}>
          <User className="h-4 w-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {isDark ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
