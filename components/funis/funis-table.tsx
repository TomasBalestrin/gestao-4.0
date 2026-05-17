"use client";

import Link from "next/link";
import { Pencil, Workflow } from "lucide-react";

import type { UserRole } from "@/types/domain";
import {
  useFunis,
  useToggleFunilArchive,
  type FunilListUser,
} from "@/hooks/useFunis";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableSkeleton } from "@/components/shared/data-table";
import { notifyError, notifySuccess } from "@/lib/utils/notify";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  social_selling: "Social Selling",
  closer: "Closer",
  sdr: "SDR",
  financeiro: "Financeiro",
  lider: "Líder",
};

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const MAX_AVATARS = 4;

function TeamAvatars({ users }: { users: FunilListUser[] }) {
  if (users.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const shown = users.slice(0, MAX_AVATARS);
  const extra = users.length - shown.length;
  return (
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
  );
}

export function FunisTable() {
  const { data: funis, isLoading, isError, error } = useFunis();
  const toggle = useToggleFunilArchive();

  if (isLoading) return <DataTableSkeleton rows={4} cols={4} />;

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Falha ao carregar funis: {(error as Error).message}
      </p>
    );
  }

  if (!funis || funis.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title="Nenhum funil ainda"
        description="Crie seu primeiro funil para organizar a operação."
        action={{ label: "Criar primeiro funil", href: "/admin/funis/novo" }}
      />
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Role alvo</TableHead>
            <TableHead>Equipe</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funis.map((funil) => {
            const active = !funil.is_archived;
            return (
              <TableRow key={funil.id}>
                <TableCell className="font-medium">{funil.nome}</TableCell>
                <TableCell className="text-muted-foreground">
                  {ROLE_LABELS[funil.role_alvo]}
                </TableCell>
                <TableCell>
                  <TeamAvatars users={funil.users} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Switch
                      checked={active}
                      disabled={toggle.isPending}
                      aria-label={
                        active ? `Arquivar ${funil.nome}` : `Ativar ${funil.nome}`
                      }
                      onCheckedChange={(next) =>
                        toggle.mutate(
                          { id: funil.id, archived: !next },
                          {
                            onSuccess: () =>
                              notifySuccess(
                                next ? "Funil ativado" : "Funil arquivado"
                              ),
                            onError: (e) => notifyError((e as Error).message),
                          }
                        )
                      }
                    />
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${funil.nome}`}
                    >
                      <Link href={`/admin/funis/${funil.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
