"use client";

import { memo } from "react";
import { AlertTriangle, Mail, Phone } from "lucide-react";

import {
  hasUnresolvedAutomationError,
  type KanbanCardData,
} from "@/hooks/useCards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChatTriggerIcon } from "@/components/chat/chat-trigger-icon";
import { InstagramTriggerIcon } from "@/components/chat/instagram-trigger-icon";

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

function KanbanCardImpl({ card, onClick }: KanbanCardProps) {
  const lead = card.lead;
  const hasError = hasUnresolvedAutomationError(card);
  return (
    <button
      type="button"
      onClick={() => onClick?.(card.id)}
      aria-label={`Abrir card de ${lead.nome}`}
      className="w-full rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-3.5 text-left transition-colors duration-150 ease-out-expo hover:border-[color:var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          <InstagramTriggerIcon cardId={card.id} funilId={card.funil_id} />
          <ChatTriggerIcon
            leadId={lead.id}
            cardId={card.id}
            hasPhone={!!lead.telefone}
          />
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
  );
}

export const KanbanCard = memo(KanbanCardImpl, (prev, next) => {
  if (prev.onClick !== next.onClick) return false;
  const a = prev.card;
  const b = next.card;
  if (a === b) return true;
  if (a.id !== b.id) return false;
  if (a.etapa_id !== b.etapa_id) return false;
  if (a.ordem_na_etapa !== b.ordem_na_etapa) return false;
  if (a.assigned_to !== b.assigned_to) return false;
  if (a.follow_up_at !== b.follow_up_at) return false;
  if (a.lead.nome !== b.lead.nome) return false;
  if (a.lead.telefone !== b.lead.telefone) return false;
  if (a.lead.email !== b.lead.email) return false;
  if (a.lead.funil_origem !== b.lead.funil_origem) return false;
  if (a.assigned?.foto_url !== b.assigned?.foto_url) return false;
  if (a.assigned?.nome !== b.assigned?.nome) return false;
  if (hasUnresolvedAutomationError(a) !== hasUnresolvedAutomationError(b)) return false;
  return true;
});
