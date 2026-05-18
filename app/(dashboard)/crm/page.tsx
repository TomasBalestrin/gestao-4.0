import Link from "next/link";
import { redirect } from "next/navigation";
import { Columns3 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FunilUser {
  id: string;
  nome: string;
  foto_url: string | null;
}

interface FunilRow {
  id: string;
  nome: string;
  descricao: string | null;
  users: FunilUser[];
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const MAX_AVATARS = 4;

function TeamAvatars({ users }: { users: FunilUser[] }) {
  if (users.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">Sem equipe vinculada</span>
    );
  }
  const shown = users.slice(0, MAX_AVATARS);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center -space-x-2">
        {shown.map((u) => (
          <Avatar
            key={u.id}
            className="h-7 w-7 ring-2 ring-card"
            title={u.nome}
          >
            {u.foto_url && <AvatarImage src={u.foto_url} alt={u.nome} />}
            <AvatarFallback className="text-[10px]">
              {initials(u.nome)}
            </AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 && (
          <span className="ml-1 inline-flex h-7 items-center justify-center rounded-full border bg-muted px-2 text-[10px] font-medium text-muted-foreground ring-2 ring-card">
            +{extra}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {users.length} {users.length === 1 ? "pessoa" : "pessoas"}
      </span>
    </div>
  );
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
      .select(
        "id, nome, descricao, user_funis(user:users(id, nome, foto_url))"
      )
      .eq("is_archived", false)
      .order("nome", { ascending: true });
    funis = (data ?? []).map((row) => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      users: (row.user_funis ?? [])
        .map((uf) => (uf as { user: FunilUser | null }).user)
        .filter((u): u is FunilUser => !!u),
    }));
  } else {
    const { data } = await supabase
      .from("user_funis")
      .select(
        "funil:funis!inner(id, nome, descricao, is_archived, user_funis(user:users(id, nome, foto_url)))"
      )
      .eq("user_id", user.id)
      .eq("funil.is_archived", false);
    funis = (data ?? [])
      .map(
        (row) =>
          row.funil as unknown as
            | (Omit<FunilRow, "users"> & {
                is_archived: boolean;
                user_funis: { user: FunilUser | null }[];
              })
            | null
      )
      .filter(
        (f): f is Omit<FunilRow, "users"> & {
          is_archived: boolean;
          user_funis: { user: FunilUser | null }[];
        } => !!f
      )
      .map(({ id, nome, descricao, user_funis }) => ({
        id,
        nome,
        descricao,
        users: (user_funis ?? [])
          .map((uf) => uf.user)
          .filter((u): u is FunilUser => !!u),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {funis.map((funil) => (
            <li key={funil.id}>
              <Link
                href={`/crm/${funil.id}`}
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
                <TeamAvatars users={funil.users} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
