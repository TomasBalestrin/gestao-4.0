import Link from "next/link";
import { redirect } from "next/navigation";
import { Columns3 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/permissions";

interface FunilRow {
  id: string;
  nome: string;
  cor: string | null;
  descricao: string | null;
}

export default async function CrmIndexPage() {
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

  let funis: FunilRow[] = [];
  if (isAdmin(profile?.role)) {
    const { data } = await supabase
      .from("funis")
      .select("id, nome, cor, descricao")
      .eq("is_archived", false)
      .order("nome", { ascending: true });
    funis = (data ?? []) as FunilRow[];
  } else {
    const { data } = await supabase
      .from("user_funis")
      .select("funil:funis!inner(id, nome, cor, descricao, is_archived)")
      .eq("user_id", user.id)
      .eq("funil.is_archived", false);
    funis = (data ?? [])
      .map(
        (row) =>
          row.funil as unknown as (FunilRow & { is_archived: boolean }) | null
      )
      .filter((f): f is FunilRow & { is_archived: boolean } => !!f)
      .map(({ id, nome, cor, descricao }) => ({ id, nome, cor, descricao }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um funil para abrir o kanban.
        </p>
      </div>

      {funis.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Columns3 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhum funil disponível</p>
          <p className="text-sm text-muted-foreground">
            Você ainda não tem acesso a nenhum funil. Fale com um administrador.
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
    </div>
  );
}
