import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface WindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  chrome?: boolean;
  bodyClassName?: string;
}

export function Window({
  title,
  chrome = true,
  className,
  bodyClassName,
  children,
  ...props
}: WindowProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px]",
        "bg-[var(--surface-elevated)] border border-[color:var(--border-strong)]",
        className
      )}
      {...props}
    >
      {chrome && (
        <div
          className="flex items-center gap-4 px-4 py-3 border-b border-[color:var(--hairline)]"
          style={{ background: "var(--window-tint)" }}
        >
          <div className="inline-flex items-center gap-2" aria-hidden>
            <span className="size-3 rounded-full border-[0.5px] border-black/10 bg-[#ff5f57]" />
            <span className="size-3 rounded-full border-[0.5px] border-black/10 bg-[#febc2e]" />
            <span className="size-3 rounded-full border-[0.5px] border-black/10 bg-[#28c840]" />
          </div>
          {title && (
            <div className="flex-1 text-center text-[13px] font-medium text-text-secondary">
              {title}
            </div>
          )}
          <div className="w-[52px]" aria-hidden />
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
