"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

import "react-big-calendar/lib/css/react-big-calendar.css";

import type { CallWithCtx } from "@/hooks/useCalls";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CallWithCtx;
}

const STATUS_COLOR: Record<CallWithCtx["status"], string> = {
  scheduled: "hsl(var(--accent))",
  completed: "hsl(var(--success))",
  cancelled: "hsl(var(--destructive))",
  no_show: "hsl(var(--destructive))",
};

interface AgendaCalendarProps {
  calls: CallWithCtx[];
  onSelectCall: (call: CallWithCtx) => void;
}

export default function AgendaCalendar({
  calls,
  onSelectCall,
}: AgendaCalendarProps) {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());

  const events = useMemo<CalendarEvent[]>(
    () =>
      calls.map((call) => ({
        id: call.id,
        title: `${call.card?.lead?.nome ?? "Lead"} · ${call.closer?.nome ?? ""}`,
        start: new Date(call.slot_start),
        end: new Date(call.slot_end),
        resource: call,
      })),
    [calls]
  );

  return (
    <div className="rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-2">
      <Calendar
        localizer={localizer}
        culture="pt-BR"
        events={events}
        views={["month", "week", "day"]}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 640 }}
        popup
        onSelectEvent={(e) => onSelectCall((e as CalendarEvent).resource)}
        eventPropGetter={(e) => ({
          style: {
            backgroundColor:
              STATUS_COLOR[(e as CalendarEvent).resource.status],
            border: "none",
            color: "hsl(var(--background))",
            fontSize: "0.75rem",
            opacity:
              (e as CalendarEvent).resource.status === "cancelled" ? 0.6 : 1,
          },
        })}
        messages={{
          today: "Hoje",
          previous: "Anterior",
          next: "Próximo",
          month: "Mês",
          week: "Semana",
          day: "Dia",
          agenda: "Agenda",
          date: "Data",
          time: "Hora",
          event: "Call",
          noEventsInRange: "Nenhuma call neste período.",
          showMore: (n) => `+${n} mais`,
        }}
      />
    </div>
  );
}
