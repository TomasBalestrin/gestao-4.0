"use client";

import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-pill border border-transparent transition-colors duration-200 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-[color:var(--border-strong)]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-[18px] rounded-full bg-white transition-transform duration-200 ease-out-expo",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
