import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Columns3,
  Phone,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCallDateTime } from "@/lib/utils/format-call";
import { Button } from "@/components/ui/button";

interface UpcomingCall {
  id: string;
  slot_start: string;
  slot_end: string;
  card: {
    id: string;
    funil_id: string;
    lead: { id: string; nome: string } | null;
  } | null;
}

function startOfMonth(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function startOfNextMonth(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

export default async function CloserHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = startOfNextMonth(now);
  const nowIso = now.toISOString();

  const [
    proximasRes,
    realizadasMesRes,
    noShowMesRes,
    agendadasMesRes,
    funisRes,
    callsRaw,
  ] = await Promise.all([
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("closer_id", user.id)
      .eq("status", "scheduled")
      .gte("slot_start", nowIso),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("closer_id", user.id)
      .eq("status", "completed")
      .gte("slot_start", monthStart)
      .lt("slot_start", monthEnd),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("closer_id", user.id)
      .eq("status", "no_show")
      .gte("slot_start", monthStart)
      .lt("slot_start", monthEnd),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("closer_id", user.id)
      .gte("slot_start", monthStart)
      .lt("slot_start", monthEnd),
    supabase
      .from("user_funis")
      .select("funil:funis!inner(id, is_archived)")
      .eq("user_id", user.id)
      .eq("funil.is_archived", false),
    supabase
      .from("calls")
      .select(
        "id, slot_start, slot_end, card:cards(id, funil_id, lead:leads(id, nome))"
      )
      .eq("closer_id", user.id)
      .eq("status", "scheduled")
      .gte("slot_start", nowIso)
      .order("slot_start", { ascending: true })
      .limit(5),
  ]);

  const upcoming = (callsRaw.data ?? []) as unknown as UpcomingCall[];
  const proximas = proximasRes.count ?? 0;
  const realizadasMes = realizadasMesRes.count ?? 0;
  const noShowMes = noShowMesRes.count ?? 0;
  const agendadasMes = agendadasMesRes.count ?? 0;
  const funisAtivos = (funisRes.data ?? []).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Painel do closer
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas calls e leads.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Próximas calls"
          value={proximas}
          icon={CalendarClock}
        />
        <KpiCard
          label="Agendadas este mês"
          value={agendadasMes}
          icon={Calendar}
        />
        <KpiCard
          label="Realizadas este mês"
          value={realizadasMes}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="No-shows este mês"
          value={noShowMes}
          icon={XCircle}
          tone="destructive"
        />
        <KpiCard
          label="Funis ativos"
          value={funisAtivos}
          icon={Columns3}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Próximas calls
          </h2>
          <Button asChild variant="link" size="sm">
            <Link href="/agenda">Ver agenda completa</Link>
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Sem calls agendadas</p>
            <p className="text-sm text-muted-foreground">
              Quando uma call for marcada para você, aparece aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((call) => (
              <li
                key={call.id}
                className="flex items-start gap-3 rounded-md border bg-card p-3"
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {formatCallDateTime(call.slot_start, call.slot_end)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lead: {call.card?.lead?.nome ?? "—"}
                  </p>
                </div>
                {call.card && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/crm/${call.card.funil_id}`}>Abrir funil</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  icon: typeof Calendar;
  tone?: "default" | "success" | "destructive";
}

function KpiCard({ label, value, icon: Icon, tone = "default" }: KpiCardProps) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
