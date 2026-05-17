"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, User as UserIcon } from "lucide-react";

import type { User, UserRole } from "@/types/domain";
import { ROLE_OPTIONS } from "@/components/forms/role-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableSkeleton } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EditUserModal } from "@/components/users/edit-user-modal";
import { notifyError, notifySuccess } from "@/lib/utils/notify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const usersKeys = { all: ["users"] as const };

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label])
) as Record<UserRole, string>;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;
  if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
  return body?.data as T;
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UsersTable() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: usersKeys.all,
    queryFn: () => getJson<User[]>("/api/users"),
  });

  const setActive = useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const res = await fetch(`/api/users/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: input.active }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: usersKeys.all });
      notifySuccess(vars.active ? "Usuário ativado" : "Usuário desativado");
    },
    onError: (err) => notifyError((err as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersKeys.all });
      notifySuccess("Usuário excluído");
    },
    onError: (err) => notifyError((err as Error).message),
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      return true;
    });
  }, [data, roleFilter, statusFilter]);

  if (isLoading) return <DataTableSkeleton rows={5} cols={5} />;
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Falha ao carregar usuários: {(error as Error).message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as "all" | UserRole)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as roles</SelectItem>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "all" | "active" | "inactive")
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum usuário encontrado" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {u.foto_url && (
                          <AvatarImage src={u.foto_url} alt={u.nome} />
                        )}
                        <AvatarFallback className="text-xs">
                          {initials(u.nome) || (
                            <UserIcon className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span>{u.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                  <TableCell>
                    <Switch
                      checked={u.is_active}
                      disabled={setActive.isPending}
                      aria-label={
                        u.is_active
                          ? `Desativar ${u.nome}`
                          : `Ativar ${u.nome}`
                      }
                      onCheckedChange={(next) =>
                        setActive.mutate({ id: u.id, active: next })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${u.nome}`}
                        onClick={() => setEditingUser(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        title={`Excluir ${u.nome}?`}
                        description="Remove o usuário permanentemente. Histórico em audit_log e referências (cards, leads) ficam com autor nulo. Se o usuário tem calls associadas, a exclusão é bloqueada — cancele as calls antes ou apenas desative."
                        confirmLabel="Excluir definitivamente"
                        destructive
                        onConfirm={() => remove.mutate(u.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={remove.isPending}
                            aria-label={`Excluir ${u.nome}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(o) => !o && setEditingUser(null)}
        />
      )}
    </div>
  );
}
