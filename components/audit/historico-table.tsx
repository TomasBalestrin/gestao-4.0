"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  ENTITY_LABELS,
  EVENT_LABELS,
  useAuditLog,
  type AuditLogFilters,
} from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoricoFilters } from "@/components/audit/historico-filters";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function HistoricoTable() {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data, isLoading, isError, error } = useAuditLog(filters);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <HistoricoFilters value={filters} onChange={setFilters} />

      {isError ? (
        <p className="text-sm text-destructive">
          Falha ao carregar histórico: {(error as Error).message}
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum evento para os filtros selecionados.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Quando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Entidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => {
                const isOpen = expanded.has(entry.id);
                return (
                  <Fragment key={entry.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggle(entry.id)}
                          aria-label="Detalhes"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fmt(entry.created_at)}
                      </TableCell>
                      <TableCell>{entry.user?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EVENT_LABELS[entry.event_type] ?? entry.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                        {" · "}
                        <span className="font-mono">
                          {entry.entity_id.slice(0, 8)}
                        </span>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/40">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                Antes
                              </p>
                              <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
                                {JSON.stringify(entry.before ?? null, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                Depois
                              </p>
                              <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
                                {JSON.stringify(entry.after ?? null, null, 2)}
                              </pre>
                            </div>
                          </div>
                          {entry.metadata != null && (
                            <div className="mt-2">
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                Metadata
                              </p>
                              <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} evento{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: page - 1 }))}
          >
            Anterior
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: page + 1 }))}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}
