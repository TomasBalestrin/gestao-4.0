import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSpinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground",
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "Carregando..."}
    </div>
  );
}

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: Math.max(1, columns) }).map((_, i) => (
        <div
          key={i}
          className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border bg-secondary/30 p-2"
        >
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  return <Skeleton className="h-[640px] w-full rounded-lg" />;
}
