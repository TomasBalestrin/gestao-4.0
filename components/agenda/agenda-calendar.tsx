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
import {
  CANCELLED_COLOR,
  COMPLETED_COLOR,
  FOLLOW_UP_COLOR,
  colorForUser,
} from "@/lib/utils/event-color";
import type { FollowUpRow } from "@/components/agenda/follow-up-item";
import { AgendaToolbar } from "@/components/agenda/agenda-toolbar";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
});

export type AgendaEvent =
  | {
      id: string;
      kind: "call";
      title: string;
      start: Date;
      end: Date;
      allDay?: false;
      resource: CallWithCtx;
    }
  | {
      id: string;
      kind: "follow-up";
      title: string;
      start: Date;
      end: Date;
      allDay: true;
      resource: FollowUpRow;
    };

interface AgendaCalendarProps {
  calls: CallWithCtx[];
  followUps: FollowUpRow[];
  onSelectCall: (call: CallWithCtx) => void;
  onSelectFollowUp: (item: FollowUpRow) => void;
}

function buildCallEvent(call: CallWithCtx): AgendaEvent {
  const leadNome = call.card?.lead?.nome ?? "Lead";
  const closerNome = call.closer?.nome ?? "";
  return {
    id: `call:${call.id}`,
    kind: "call",
    title: closerNome ? `${leadNome} · ${closerNome}` : leadNome,
    start: new Date(call.slot_start),
    end: new Date(call.slot_end),
    resource: call,
  };
}

function buildFollowUpEvent(f: FollowUpRow): AgendaEvent {
  // due_date é DATE (yyyy-mm-dd). Tratar como local pra não pular fuso.
  const [y, m, d] = f.due_date.split("-").map((p) => parseInt(p, 10));
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  return {
    id: `follow-up:${f.id}`,
    kind: "follow-up",
    title: `🚩 ${f.card?.lead?.nome ?? "Follow-up"}`,
    start: date,
    end: date,
    allDay: true,
    resource: f,
  };
}

export default function AgendaCalendar({
  calls,
  followUps,
  onSelectCall,
  onSelectFollowUp,
}: AgendaCalendarProps) {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());

  const events = useMemo<AgendaEvent[]>(() => {
    const callEvents = calls.map(buildCallEvent);
    const followUpEvents = followUps
      .filter((f) => !f.done_at)
      .map(buildFollowUpEvent);
    return [...followUpEvents, ...callEvents];
  }, [calls, followUps]);

  return (
    <div className="rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-3">
      <Calendar
        localizer={localizer}
        culture="pt-BR"
        events={events}
        views={["month", "week", "day", "agenda"]}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        startAccessor="start"
        endAccessor="end"
        allDayAccessor="allDay"
        style={{ height: 680 }}
        popup
        components={{ toolbar: AgendaToolbar }}
        onSelectEvent={(e) => {
          const ev = e as AgendaEvent;
          if (ev.kind === "call") onSelectCall(ev.resource);
          else onSelectFollowUp(ev.resource);
        }}
        eventPropGetter={(e) => {
          const ev = e as AgendaEvent;
          let color = FOLLOW_UP_COLOR;
          if (ev.kind === "call") {
            if (ev.resource.status === "completed") color = COMPLETED_COLOR;
            else if (
              ev.resource.status === "cancelled" ||
              ev.resource.status === "no_show"
            )
              color = CANCELLED_COLOR;
            else color = colorForUser(ev.resource.closer_id);
          }
          return {
            style: {
              backgroundColor: color.bgSoft,
              color: color.text,
              borderLeft: `3px solid ${color.border}`,
              borderRadius: "6px",
              padding: "2px 6px",
              fontSize: "0.78rem",
              fontWeight: 500,
              opacity:
                ev.kind === "call" && ev.resource.status === "cancelled"
                  ? 0.55
                  : 1,
            },
          };
        }}
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
          event: "Evento",
          noEventsInRange: "Nenhum evento neste período.",
          showMore: (n) => `+${n} mais`,
        }}
      />
    </div>
  );
}
