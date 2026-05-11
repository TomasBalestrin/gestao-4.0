"use client";

import { Mail, Phone } from "lucide-react";

import type { KanbanCardData } from "@/hooks/useCards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  return (
    <button
      type="button"
      onClick={() => onClick?.(card.id)}
      className="w-full rounded-md border bg-card p-3 text-left transition-colors hover:border-foreground/30"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{lead.nome}</p>
        {card.assigned && (
          <Avatar className="h-6 w-6 shrink-0">
            {card.assigned.foto_url && (
              <AvatarImage src={card.assigned.foto_url} alt={card.assigned.nome} />
            )}
            <AvatarFallback className="text-[10px]">
              {initials(card.assigned.nome)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {(lead.telefone || lead.email) && (
        <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
          {lead.telefone && (
            <p className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {lead.telefone}
            </p>
          )}
          {lead.email && (
            <p className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </p>
          )}
        </div>
      )}

      {lead.origem && (
        <div className="mt-2">
          <Badge variant="secondary" className="text-[10px]">
            {lead.origem}
          </Badge>
        </div>
      )}
    </button>
  );
}
