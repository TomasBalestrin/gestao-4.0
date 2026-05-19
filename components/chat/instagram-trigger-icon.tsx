"use client";

import { Instagram } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils/cn";
import { useKanbanStore } from "@/lib/stores/kanbanStore";

interface InstagramTriggerIconProps {
  cardId: string;
  funilId: string;
  variant?: "card" | "header";
  className?: string;
}

interface IgInstanceLite {
  id: string;
  status: string;
}

async function fetchIgStatus(funilId: string): Promise<IgInstanceLite | null> {
  const res = await fetch(`/api/instagram/instances/${funilId}`);
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as
    | { data?: IgInstanceLite | null }
    | null;
  return body?.data ?? null;
}

// Aparece no kanban-card SO se o funil tem instancia IG conectada.
// Click abre o modal do card direto no pane "instagram".
export function InstagramTriggerIcon({
  cardId,
  funilId,
  variant = "card",
  className,
}: InstagramTriggerIconProps) {
  const openCard = useKanbanStore((s) => s.openCard);
  const query = useQuery({
    queryKey: ["ig-instance", funilId],
    queryFn: () => fetchIgStatus(funilId),
    staleTime: 5 * 60_000,
  });

  if (query.data?.status !== "connected") return null;

  const sizeCls = variant === "header" ? "h-8 w-8" : "h-7 w-7";
  const iconCls = variant === "header" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        openCard(cardId, "instagram");
      }}
      aria-label="Abrir conversa Instagram"
      title="Abrir conversa Instagram"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        sizeCls,
        className
      )}
    >
      <Instagram className={iconCls} />
    </button>
  );
}
