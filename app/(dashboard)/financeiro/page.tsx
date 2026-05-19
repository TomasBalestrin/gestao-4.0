import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { canAccessFinanceiro } from "@/lib/utils/permissions";

interface FunilCard {
  id: string;
  nome: string;
  descricao: string | null;
  cardCount: number;
}

export default async function FinanceiroIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!canAccessFinanceiro(profile?.role)) redirect("/");

  // Financeiro/admin enxergam todos os funis com role_alvo='financeiro'.
  // Estes sao os funis "destino" pra onde cards de venda fechada caem.
  const { data: funisRaw } = await supabase
    .from("funis")
    .select("id, nome, descricao, cards:cards(id, deleted_at)")
    .eq("role_alvo", "financeiro")
    .eq("is_archived", false)
    .order("nome", { ascending: true });

  const funis: FunilCard[] = (funisRaw ?? []).map((f) => ({
    id: f.id,
    nome: f.nome,
    descricao: f.descricao,
    cardCount: (
      (f.cards as { deleted_at: string | null }[] | null) ?? []
    ).filter((c) => c.deleted_at === null).length,
  }));

  if (funis.length === 1) redirect(`/financeiro/${funis[0]!.id}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Cards enviados pelos closers ao fechar vendas. Voce ve todos os
          closers, sem filtro.
        </p>
      </div>

      {funis.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhum funil financeiro</p>
          <p className="text-sm text-muted-foreground">
            O admin precisa criar um funil com role &quot;financeiro&quot; e
            ligar o gatilho no funil de origem.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {funis.map((funil) => (
            <li key={funil.id}>
              <Link
                href={`/financeiro/${funil.id}`}
                className="flex aspect-square flex-col justify-between rounded-[12px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-5 transition-colors hover:border-foreground/30"
              >
                <div>
                  <p className="text-base font-semibold">{funil.nome}</p>
                  {funil.descricao && (
                    <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">
                      {funil.descricao}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {funil.cardCount} {funil.cardCount === 1 ? "card" : "cards"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
