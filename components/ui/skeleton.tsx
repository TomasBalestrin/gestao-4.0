import { cn } from "@/lib/utils/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[8px] bg-[var(--surface-elevated)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
