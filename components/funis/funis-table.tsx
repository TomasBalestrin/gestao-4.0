"use client";

import Link from "next/link";
import { Archive, Pencil, Workflow } from "lucide-react";

import type { UserRole } from "@/types/domain";
import { useArchiveFunil, useFunis } from "@/hooks/useFunis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  social_selling: "Social Selling",
  closer: "Closer",
  sdr: "SDR",
  financeiro: "Financeiro",
  lider: "Líder",
};

export function FunisTable() {
  const { data: funis, isLoading, isError, error } = useFunis();
  const archive = useArchiveFunil();

  if (isLoading) return <DataTableSkeleton rows={4} cols={5} />;

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
            <TableHead className="text-center">Etapas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funis.map((funil) => (
            <TableRow key={funil.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: funil.cor }}
                  />
                  <span className="font-medium">{funil.nome}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {ROLE_LABELS[funil.role_alvo]}
              </TableCell>
              <TableCell className="text-center">{funil.etapas_count}</TableCell>
              <TableCell>
                {funil.is_archived ? (
                  <Badge variant="secondary">Arquivado</Badge>
                ) : (
                  <Badge variant="outline">Ativo</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/funis/${funil.id}`}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                  {!funil.is_archived && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={archive.isPending}
                      onClick={() => archive.mutate(funil.id)}
                    >
                      <Archive className="h-4 w-4" />
                      Arquivar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
