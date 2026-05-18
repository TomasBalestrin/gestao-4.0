"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, LogOut, User } from "lucide-react";

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
          "group flex w-full items-center gap-2 rounded-[10px] p-2 transition-colors duration-200 hover:bg-[var(--surface-glass)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          collapsed && "justify-center"
        )}
      >
        <Avatar size="md" className="shrink-0">
          {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
          <AvatarFallback className="text-[12px]">
            {initials(nome) || <User className="size-4" />}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-foreground">
              {nome}
            </span>
            <ChevronUp className="size-4 shrink-0 text-text-muted transition-transform group-data-[state=open]:rotate-180" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal">
          <span className="text-[13px] font-medium text-foreground">{nome}</span>
          <span className="text-[11px] font-normal text-text-muted">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openProfile()}>
          <User className="h-4 w-4" />
          Perfil
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
