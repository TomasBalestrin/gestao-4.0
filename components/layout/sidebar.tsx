"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  Clock,
  Columns3,
  History,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  Settings,
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
  isCloser,
} from "@/lib/utils/permissions";
import { useFunis } from "@/hooks/useFunis";
import { useUiStore } from "@/lib/stores/uiStore";
import { Button } from "@/components/ui/button";
import { SidebarUserCard } from "@/components/layout/sidebar-user-card";

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
  const expand = useUiStore((s) => s.setSidebarCollapsed);
  const closer = isCloser(role);

  const mainItems: NavItem[] = [
    { href: "/crm", label: "CRM", icon: Columns3, visible: canAccessCrm(role) },
    {
      href: "/agenda",
      label: "Agenda",
      icon: Calendar,
      visible: canAccessAgenda(role),
    },
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

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderItem({ href, label, icon: Icon }: NavItem) {
    const active = isActive(href);
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
          "flex h-14 items-center gap-2 border-b px-3",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <>
            <div className="brand-mark h-7 w-7" aria-label="Gestão 4.0" />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="h-7 w-7"
              aria-label="Expandir menu"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="brand-mark h-6 w-6 shrink-0" />
              <span className="truncate text-base font-semibold tracking-tight">
                Gestão 4.0
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="h-7 w-7 shrink-0"
              aria-label="Recolher menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <nav
        aria-label="Navegação principal"
        className="flex-1 space-y-1 overflow-y-auto p-2"
      >
        {closer ? (
          <CloserNav
            collapsed={collapsed}
            isActive={isActive}
            onWantExpand={() => expand(false)}
          />
        ) : (
          <>
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
          </>
        )}
      </nav>

      <div className="border-t p-2">
        <SidebarUserCard collapsed={collapsed} />
      </div>
    </aside>
  );
}

interface CloserNavProps {
  collapsed: boolean;
  isActive: (href: string) => boolean;
  onWantExpand: () => void;
}

function CloserNav({ collapsed, isActive, onWantExpand }: CloserNavProps) {
  const [funisOpen, setFunisOpen] = useState(true);
  const funisQuery = useFunis();
  const funis = (funisQuery.data ?? [])
    .filter((f) => !f.is_archived)
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const someFunilActive = funis.some((f) => isActive(`/crm/${f.id}`));

  function linkClass(active: boolean): string {
    return cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      active
        ? "bg-secondary text-foreground"
        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      collapsed && "justify-center px-0"
    );
  }

  return (
    <>
      <Link
        href="/closer"
        aria-current={isActive("/closer") && !isActive("/closer/horarios") ? "page" : undefined}
        title={collapsed ? "Dashboard" : undefined}
        className={linkClass(
          isActive("/closer") && !isActive("/closer/horarios")
        )}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">Dashboard</span>}
      </Link>

      <Link
        href="/agenda"
        aria-current={isActive("/agenda") ? "page" : undefined}
        title={collapsed ? "Agenda" : undefined}
        className={linkClass(isActive("/agenda"))}
      >
        <Calendar className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">Agenda</span>}
      </Link>

      <button
        type="button"
        onClick={() => {
          if (collapsed) {
            onWantExpand();
            setFunisOpen(true);
          } else {
            setFunisOpen((s) => !s);
          }
        }}
        title={collapsed ? "Meus funis" : undefined}
        aria-expanded={!collapsed ? funisOpen : undefined}
        className={cn(
          linkClass(someFunilActive),
          "w-full text-left"
        )}
      >
        <Columns3 className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">Meus funis</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                funisOpen && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {!collapsed && funisOpen && (
        <div className="space-y-0.5 pl-2">
          {funisQuery.isLoading ? (
            <p className="px-3 py-1 text-xs text-muted-foreground">
              Carregando...
            </p>
          ) : funis.length === 0 ? (
            <p className="px-3 py-1 text-xs text-muted-foreground">
              Nenhum funil atribuído.
            </p>
          ) : (
            funis.map((f) => {
              const active = isActive(`/crm/${f.id}`);
              return (
                <Link
                  key={f.id}
                  href={`/crm/${f.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <span className="truncate">{f.nome}</span>
                </Link>
              );
            })
          )}
        </div>
      )}

      <Link
        href="/closer/horarios"
        aria-current={isActive("/closer/horarios") ? "page" : undefined}
        title={collapsed ? "Meus horários" : undefined}
        className={linkClass(isActive("/closer/horarios"))}
      >
        <Clock className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">Meus horários</span>}
      </Link>
    </>
  );
}
