import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded-[9px] px-3 py-2.5 text-[14px] leading-[1.5] transition-colors duration-150 ease-out-expo resize-y",
          "bg-transparent text-foreground",
          "border border-[color:var(--border-strong)]",
          "placeholder:text-text-muted",
          "hover:border-[color:var(--text-muted)]",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          "aria-[invalid=true]:border-[color:var(--danger-color)] aria-[invalid=true]:focus-visible:ring-[color:var(--danger-soft)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
