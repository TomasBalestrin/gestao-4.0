import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "border border-transparent select-none relative",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "transition-[background,color,border-color,transform] duration-200 ease-out-expo",
    "active:scale-[0.96] active:duration-[70ms]",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-[15px] [&_svg]:shrink-0",
    "tracking-tight",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--navy-hover)]",
        primary:
          "bg-primary text-primary-foreground hover:bg-[var(--navy-hover)]",
        secondary: [
          "bg-[var(--surface-elevated)] text-foreground",
          "border-[color:var(--border-strong)]",
          "hover:border-[color:var(--text-muted)]",
        ].join(" "),
        ghost:
          "text-text-secondary hover:bg-[var(--surface-glass)] hover:text-foreground",
        outline: [
          "bg-transparent text-foreground",
          "border-[color:var(--border-strong)]",
          "hover:bg-[var(--surface-glass)]",
        ].join(" "),
        destructive:
          "bg-[var(--danger-soft)] text-[color:var(--danger-color)] hover:bg-[var(--danger-color)] hover:text-white border-[color:var(--danger-color)]/40",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-7 px-2.5 text-[12.5px] rounded-[7px]",
        default: "h-9 px-3.5 text-[13.5px] rounded-[9px]",
        lg: "h-11 px-5 text-[14.5px] rounded-[11px]",
        icon: "h-9 w-9 p-0 rounded-[9px]",
        "icon-sm": "h-7 w-7 p-0 rounded-[7px]",
        "icon-lg": "h-11 w-11 p-0 rounded-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
