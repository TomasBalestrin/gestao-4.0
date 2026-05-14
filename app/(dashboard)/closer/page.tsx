import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Calendar, Columns3 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCallDateTime } from "@/lib/utils/format-call";
import { Button } from "@/components/ui/button";

interface FunilRow {
  id: string;
  nome: string;
  cor: string | null;
  descricao: string | null;
}

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

export default async function CloserHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: funisJoin } = await supabase
    .from("user_funis")
    .select("funil:funis!inner(id, nome, cor, descricao, is_archived)")
    .eq("user_id", user.id)
    .eq("funil.is_archived", false);

  const funis: FunilRow[] = (funisJoin ?? [])
    .map((row) => row.funil as unknown as FunilRow & { is_archived: boolean } | null)
    .filter((f): f is FunilRow & { is_archived: boolean } => !!f)
    .map(({ id, nome, cor, descricao }) => ({ id, nome, cor, descricao }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const nowIso = new Date().toISOString();
  const { data: callsRaw } = await supabase
    .from("calls")
    .select(
      "id, slot_start, slot_end, card:cards(id, funil_id, lead:leads(id, nome))"
    )
    .eq("closer_id", user.id)
    .eq("status", "scheduled")
    .gte("slot_start", nowIso)
    .order("slot_start", { ascending: true })
    .limit(5);

  const upcoming: UpcomingCall[] = (callsRaw ?? []) as unknown as UpcomingCall[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight">
          Painel do closer
        </h1>
        <p className="text-sm text-muted-foreground">
          Seus funis e suas próximas calls.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Meus funis
          </h2>
          {funis.length > 0 && (
            <Button asChild variant="link" size="sm">
              <Link href="/crm">Ver no CRM</Link>
            </Button>
          )}
        </div>

        {funis.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <Columns3 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum funil atribuído</p>
            <p className="text-sm text-muted-foreground">
              Fale com um administrador para receber acesso a um funil.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {funis.map((funil) => (
              <li key={funil.id}>
                <Link
                  href={`/crm/${funil.id}`}
                  className="block rounded-lg border bg-card p-4 transition-colors hover:border-foreground/30"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: funil.cor ?? "#999" }}
                    />
                    <span className="font-medium">{funil.nome}</span>
                  </div>
                  {funil.descricao && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {funil.descricao}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
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
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
