import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatProps {
  label: string;
  value: React.ReactNode;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  hint?: string;
  className?: string;
}

export function Stat({
  label,
  value,
  trend,
  trendValue,
  hint,
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] p-[18px]",
        "bg-[var(--surface-elevated)] border border-[color:var(--border-strong)]",
        className
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </div>
      <div className="mt-2 text-[30px] font-bold leading-none tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {trend && trendValue && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[12px] font-medium",
              trend === "up" && "text-[color:var(--success-color)]",
              trend === "down" && "text-[color:var(--danger-color)]",
              trend === "flat" && "text-text-muted"
            )}
          >
            {trend === "up" && <ArrowUp className="size-3" />}
            {trend === "down" && <ArrowDown className="size-3" />}
            {trendValue}
          </span>
        )}
        {hint && <span className="text-[12px] text-text-muted">{hint}</span>}
      </div>
    </div>
  );
}
