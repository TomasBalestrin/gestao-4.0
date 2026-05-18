"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { User, UserRole } from "@/types/domain";
import { ROLE_OPTIONS } from "@/components/forms/role-select";
import { notifyError, notifySuccess } from "@/lib/utils/notify";

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label])
) as Record<UserRole, string>;

interface FunilAcessosProps {
  funilId: string;
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
    queryFn: () => getJson<string[]>(`/api/funis/${funilId}/usuarios`),
  });

  const assignedSet = new Set(acessosQuery.data ?? []);

  const add = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/funis/${funilId}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({
        queryKey: ["funil-acessos", funilId],
      });
      const prev = queryClient.getQueryData<string[]>([
        "funil-acessos",
        funilId,
      ]);
      queryClient.setQueryData<string[]>(
        ["funil-acessos", funilId],
        [...(prev ?? []), userId]
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(["funil-acessos", funilId], ctx.prev);
      }
      notifyError(`Falha ao adicionar acesso: ${(err as Error).message}`);
    },
    onSuccess: () => notifySuccess("Acesso concedido"),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["funil-acessos", funilId],
      });
    },
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
    onMutate: async (userId) => {
      await queryClient.cancelQueries({
        queryKey: ["funil-acessos", funilId],
      });
      const prev = queryClient.getQueryData<string[]>([
        "funil-acessos",
        funilId,
      ]);
      queryClient.setQueryData<string[]>(
        ["funil-acessos", funilId],
        (prev ?? []).filter((id) => id !== userId)
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(["funil-acessos", funilId], ctx.prev);
      }
      notifyError(`Falha ao remover acesso: ${(err as Error).message}`);
    },
    onSuccess: () => notifySuccess("Acesso removido"),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["funil-acessos", funilId],
      });
    },
  });

  function toggle(userId: string, currently: boolean) {
    if (currently) remove.mutate(userId);
    else add.mutate(userId);
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

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {users.map((u) => {
        const assigned = assignedSet.has(u.id);
        const pending = add.isPending || remove.isPending;
        return (
          <li key={u.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-[color:var(--border-rgba)] bg-[var(--surface-elevated)] p-2 text-sm hover:border-foreground/30">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={assigned}
                disabled={pending}
                onChange={() => toggle(u.id, assigned)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[u.role] ?? u.role}
                </p>
              </div>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
