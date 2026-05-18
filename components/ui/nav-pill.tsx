"use client";

import * as React from "react";
import Link from "next/link";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface NavPillItemProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  layoutId?: string;
}

export function NavPillItem({
  href,
  active,
  children,
  icon,
  layoutId = "nav-pill-indicator",
}: NavPillItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ease-out-expo",
        active ? "text-primary" : "text-text-secondary hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-[8px] bg-[var(--accent-soft)]"
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30,
            mass: 0.6,
          }}
          aria-hidden
        />
      )}
      {active && (
        <motion.span
          layoutId={`${layoutId}-dot`}
          className="absolute -bottom-1.5 left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
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
    <LayoutGroup>
      <nav
        aria-label={ariaLabel}
        className={cn("flex items-center gap-0.5", className)}
      >
        {children}
      </nav>
    </LayoutGroup>
  );
}
