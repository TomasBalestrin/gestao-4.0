"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { User, UserRole } from "@/types/domain";
import { ROLE_OPTIONS } from "@/components/forms/role-select";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import { Switch } from "@/components/ui/switch";

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label])
) as Record<UserRole, string>;

interface FunilAcessosProps {
  funilId: string;
}

interface AcessoRow {
  user_id: string;
  is_spectator: boolean;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

export function FunilAcessos({ funilId }: FunilAcessosProps) {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => getJson<User[]>("/api/users"),
  });
  const acessosQuery = useQuery({
    queryKey: ["funil-acessos", funilId],
    queryFn: () => getJson<AcessoRow[]>(`/api/funis/${funilId}/usuarios`),
  });

  const acessosByUser = new Map<string, AcessoRow>(
    (acessosQuery.data ?? []).map((r) => [r.user_id, r])
  );

  const upsert = useMutation({
    mutationFn: async (input: {
      user_id: string;
      is_spectator?: boolean;
    }) => {
      const res = await fetch(`/api/funis/${funilId}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["funil-acessos", funilId],
      });
    },
    onError: (err) =>
      notifyError(`Falha ao salvar acesso: ${(err as Error).message}`),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/funis/${funilId}/usuarios/${userId}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      notifySuccess("Acesso removido");
      void queryClient.invalidateQueries({
        queryKey: ["funil-acessos", funilId],
      });
    },
    onError: (err) =>
      notifyError(`Falha ao remover acesso: ${(err as Error).message}`),
  });

  function toggleAcesso(userId: string, currently: boolean) {
    if (currently) remove.mutate(userId);
    else upsert.mutate({ user_id: userId, is_spectator: false });
  }

  function toggleSpectator(userId: string, next: boolean) {
    upsert.mutate({ user_id: userId, is_spectator: next });
  }

  if (usersQuery.isLoading || acessosQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (usersQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Falha ao carregar usuários: {(usersQuery.error as Error).message}
      </p>
    );
  }

  const users = (usersQuery.data ?? [])
    .filter((u) => u.is_active && u.role !== "admin")
    .sort((a, b) => a.nome.localeCompare(b.nome));

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum usuário ativo (fora admin) para conceder acesso.
      </p>
    );
  }

  const pending = upsert.isPending || remove.isPending;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {users.map((u) => {
        const acesso = acessosByUser.get(u.id);
        const assigned = !!acesso;
        const isSpectator = acesso?.is_spectator ?? false;
        return (
          <li key={u.id}>
            <div className="rounded-[10px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-2.5 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={assigned}
                  disabled={pending}
                  onChange={() => toggleAcesso(u.id, assigned)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </p>
                </div>
              </label>
              {assigned && (
                <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Espectador</p>
                    <p className="text-[11px] text-muted-foreground">
                      Vê todos os cards mas não move/edita o funil.
                    </p>
                  </div>
                  <Switch
                    checked={isSpectator}
                    disabled={pending}
                    onCheckedChange={(v) => toggleSpectator(u.id, v)}
                    aria-label={`Modo espectador para ${u.nome}`}
                  />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
