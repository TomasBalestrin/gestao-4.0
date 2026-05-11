import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey?: (row: T, index: number) => string;
}

// Tabela genérica fina sobre os primitivos shadcn. Útil para listagens simples;
// listas com lógica própria (expand, ações inline) continuam montando a Table.
export function DataTable<T extends { id?: string }>({
  columns,
  data,
  getRowKey,
}: DataTableProps<T>) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={getRowKey?.(row, i) ?? row.id ?? String(i)}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataTableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {Array.from({ length: Math.max(1, rows) }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: Math.max(1, cols) }).map((_, c) => (
            <Skeleton
              key={c}
              className={c === 0 ? "h-6 flex-1" : "h-6 w-24"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
