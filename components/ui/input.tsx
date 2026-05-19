import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[9px] px-3 py-2 text-[14px] transition-colors duration-150 ease-out-expo",
          "bg-transparent text-foreground",
          "border border-[color:var(--border-strong)]",
          "placeholder:text-text-muted",
          "hover:border-[color:var(--text-muted)]",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          "aria-[invalid=true]:border-[color:var(--danger-color)] aria-[invalid=true]:focus-visible:ring-[color:var(--danger-soft)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
