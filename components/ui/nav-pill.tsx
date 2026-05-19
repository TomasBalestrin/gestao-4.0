"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface NavPillItemProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function NavPillItem({
  href,
  active,
  children,
  icon,
}: NavPillItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out-expo",
        active ? "text-primary" : "text-text-secondary hover:text-foreground"
      )}
    >
      {active && (
        <span
          className="absolute inset-0 rounded-[8px] bg-[var(--accent-soft)]"
          aria-hidden
        />
      )}
      {active && (
        <span
          className="absolute -bottom-1.5 left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-primary"
          aria-hidden
        />
      )}
      {icon && <span className="relative size-3.5 [&_svg]:size-full">{icon}</span>}
      <span className="relative">{children}</span>
    </Link>
  );
}

interface NavPillProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function NavPill({ children, className, "aria-label": ariaLabel }: NavPillProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("flex items-center gap-0.5", className)}
    >
      {children}
    </nav>
  );
}
