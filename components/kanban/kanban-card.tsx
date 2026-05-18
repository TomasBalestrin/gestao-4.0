"use client";

import { AlertTriangle, Mail, Phone } from "lucide-react";

import {
  hasUnresolvedAutomationError,
  type KanbanCardData,
} from "@/hooks/useCards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { KanbanCardModal } from "@/components/kanban/kanban-card-modal";
import { ChatTriggerIcon } from "@/components/chat/chat-trigger-icon";

interface KanbanCardProps {
  card: KanbanCardData;
  onClick?: (cardId: string) => void;
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const lead = card.lead;
  const hasError = hasUnresolvedAutomationError(card);
  return (
    <>
      <KanbanCardModal card={card} />
      <button
        type="button"
        onClick={() => onClick?.(card.id)}
        aria-label={`Abrir card de ${lead.nome}`}
        className="w-full rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-3.5 text-left transition-all duration-200 ease-out-expo hover:border-[color:var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[14px] font-medium leading-tight text-foreground">
          {hasError && (
            <AlertTriangle
              className="size-3.5 shrink-0 text-[color:var(--danger-color)]"
              aria-label="Automação com falha"
            />
          )}
          {lead.nome}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <ChatTriggerIcon leadId={lead.id} hasPhone={!!lead.telefone} />
          {card.assigned && (
            <Avatar size="sm" className="shrink-0">
              {card.assigned.foto_url && (
                <AvatarImage src={card.assigned.foto_url} alt={card.assigned.nome} />
              )}
              <AvatarFallback className="text-[10px]">
                {initials(card.assigned.nome)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {(lead.telefone || lead.email) && (
        <div className="mt-2 space-y-0.5 font-mono text-[11px] text-text-muted">
          {lead.telefone && (
            <p className="flex items-center gap-1.5">
              <Phone className="size-3" />
              {lead.telefone}
            </p>
          )}
          {lead.email && (
            <p className="flex items-center gap-1.5 truncate">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </p>
          )}
        </div>
      )}

      {lead.funil_origem && (
        <div className="mt-2.5">
          <Badge variant="default" className="text-[10px]" dot={false}>
            {lead.funil_origem}
          </Badge>
        </div>
      )}
      </button>
    </>
  );
}
