"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ToolbarProps, View } from "react-big-calendar";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const VIEW_LABEL: Record<View, string> = {
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  work_week: "Semana útil",
};

export function AgendaToolbar(props: ToolbarProps) {
  const { label, onNavigate, onView, view, views } = props;
  const viewList = (Array.isArray(views) ? views : (Object.keys(views) as View[])) as View[];

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigate("TODAY")}
        >
          Hoje
        </Button>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onNavigate("PREV")}
            aria-label="Anterior"
            className="inline-flex size-8 items-center justify-center rounded-l-[9px] border border-[color:var(--border-strong)] text-text-secondary transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("NEXT")}
            aria-label="Próximo"
            className="-ml-px inline-flex size-8 items-center justify-center rounded-r-[9px] border border-[color:var(--border-strong)] text-text-secondary transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <h2 className="ml-1 text-[18px] font-semibold tracking-tight text-foreground first-letter:uppercase">
          {label}
        </h2>
      </div>

      <div
        role="tablist"
        aria-label="Visualização"
        className="inline-flex items-center rounded-[10px] border border-[color:var(--border-strong)] bg-[var(--surface-elevated)] p-0.5"
      >
        {viewList.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => onView(v)}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium leading-none transition-colors duration-150",
              view === v
                ? "bg-primary text-primary-foreground"
                : "text-text-secondary hover:text-foreground"
            )}
          >
            {VIEW_LABEL[v] ?? v}
          </button>
        ))}
      </div>
    </div>
  );
}
