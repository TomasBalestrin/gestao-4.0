"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface SegmentedOption<T extends string = string> {
  label: React.ReactNode;
  value: T;
  icon?: React.ReactNode;
}

interface SegmentedProps<T extends string = string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
  size?: "sm" | "default";
}

export function Segmented<T extends string = string>({
  options,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
  size = "default",
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-[2px] p-[3px] rounded-[10px]",
        "bg-[var(--surface-elevated)] border border-[color:var(--border-strong)]",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[7px] font-medium leading-none transition-all duration-200 ease-out-expo",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              size === "sm" ? "px-2.5 py-1.5 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]",
              active
                ? "bg-[var(--surface-solid)] text-foreground border border-[color:var(--border-strong)]"
                : "text-text-secondary border border-transparent hover:text-foreground"
            )}
          >
            {opt.icon && <span className="size-3.5 [&_svg]:size-full">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
