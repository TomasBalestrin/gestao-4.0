"use client";

import type { LucideIcon } from "lucide-react";
import {
  CircleDollarSign,
  History,
  Instagram,
  MessageCircle,
  Trash2,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type CardModalPane =
  | "dados"
  | "venda"
  | "chat"
  | "instagram"
  | "historico";

interface NavItem {
  id: CardModalPane;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS_BASE: NavItem[] = [
  { id: "dados", label: "Dados", icon: User },
  { id: "venda", label: "Venda", icon: CircleDollarSign },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "historico", label: "Histórico", icon: History },
];

interface KanbanCardModalSidebarProps {
  active: CardModalPane;
  onSelect: (pane: CardModalPane) => void;
  onDelete?: () => void;
  canDelete: boolean;
  // Quando false, esconde o pane "venda" (usuario nao tem permissao
  // pra ver/criar vendas; today admin OU closer).
  canVenda: boolean;
}

export function KanbanCardModalSidebar({
  active,
  onSelect,
  onDelete,
  canDelete,
  canVenda,
}: KanbanCardModalSidebarProps) {
  const items = NAV_ITEMS_BASE.filter(
    (i) => i.id !== "venda" || canVenda
  );

  return (
    <nav
      aria-label="Seções do card"
      className="flex h-full w-14 shrink-0 flex-col items-center justify-between border-r bg-muted/30 py-3"
    >
      <ul className="flex flex-col items-center gap-1">
        {items.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                className={cn(
                  "relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-accent text-foreground"
                )}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-foreground"
                  />
                )}
                <Icon className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir card"
          title="Excluir card"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </nav>
  );
}
