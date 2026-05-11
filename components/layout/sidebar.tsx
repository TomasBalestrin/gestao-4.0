"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Clock,
  Columns3,
  History,
  PanelLeft,
  PanelLeftClose,
  Settings,
  User,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import {
  canAccessAgenda,
  canAccessCrm,
  isAdmin,
} from "@/lib/utils/permissions";
import { useUiStore } from "@/lib/stores/uiStore";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  visible: boolean;
}

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  const mainItems: NavItem[] = [
    { href: "/crm", label: "CRM", icon: Columns3, visible: canAccessCrm(role) },
    {
      href: "/agenda",
      label: "Agenda",
      icon: Calendar,
      visible: canAccessAgenda(role),
    },
    { href: "/perfil", label: "Perfil", icon: User, visible: true },
  ];

  const adminItems: NavItem[] = [
    { href: "/admin/funis", label: "Funis", icon: Workflow, visible: true },
    { href: "/admin/usuarios", label: "Usuários", icon: Users, visible: true },
    { href: "/admin/horarios", label: "Horários", icon: Clock, visible: true },
    {
      href: "/admin/historico",
      label: "Histórico",
      icon: History,
      visible: true,
    },
    {
      href: "/admin/configuracoes",
      label: "Configurações",
      icon: Settings,
      visible: true,
    },
  ];

  function renderItem({ href, label, icon: Icon }: NavItem) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          active
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-card lg:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b px-4",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <span className="text-sm font-bold">G4</span>
        ) : (
          <span className="text-sm font-semibold tracking-tight">
            Gestão 4.0
          </span>
        )}
      </div>

      <nav
        aria-label="Navegação principal"
        className="flex-1 space-y-1 overflow-y-auto p-2"
      >
        {mainItems.filter((i) => i.visible).map(renderItem)}

        {isAdmin(role) && (
          <>
            <div className="px-3 pb-1 pt-4">
              {!collapsed && (
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
              )}
              {collapsed && <div className="h-px bg-border" />}
            </div>
            {adminItems.filter((i) => i.visible).map(renderItem)}
          </>
        )}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className={cn("w-full justify-start gap-2", collapsed && "justify-center")}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Recolher</span>
            </>
          )}
        </Button>
        {!collapsed && (
          <p className="px-3 pt-2 text-[10px] text-muted-foreground/70">
            Gestão 4.0 · v1.0
          </p>
        )}
      </div>
    </aside>
  );
}
