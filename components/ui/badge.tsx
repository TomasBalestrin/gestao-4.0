import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full",
    "font-mono text-[11px] font-medium leading-none tracking-wide",
    "border transition-colors duration-200 ease-out-expo",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--surface-elevated)] text-text-secondary border-[color:var(--border-strong)]",
        ].join(" "),
        secondary: [
          "bg-[var(--surface-elevated)] text-text-secondary border-[color:var(--border-strong)]",
        ].join(" "),
        success:
          "bg-[var(--success-soft)] text-[color:var(--success-color)] border-transparent",
        warning:
          "bg-[var(--warning-soft)] text-[color:var(--warning-color)] border-transparent",
        danger:
          "bg-[var(--danger-soft)] text-[color:var(--danger-color)] border-transparent",
        destructive:
          "bg-[var(--danger-soft)] text-[color:var(--danger-color)] border-transparent",
        accent:
          "bg-[var(--accent-soft)] text-primary border-transparent",
        "solid-accent":
          "bg-primary text-primary-foreground border-transparent",
        outline:
          "bg-transparent text-foreground border-[color:var(--border-strong)]",
      },
      dot: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      dot: true,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({
  className,
  variant,
  dot = true,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className="inline-block size-[5px] rounded-full bg-current shrink-0"
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
