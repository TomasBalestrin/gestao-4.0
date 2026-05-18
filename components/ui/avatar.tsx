"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const avatarVariants = cva(
  "relative inline-flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-6 w-6 text-[10px]",
        md: "h-9 w-9 text-[13px]",
        lg: "h-12 w-12 text-[16px]",
        default: "h-10 w-10 text-[14px]",
      },
    },
    defaultVariants: { size: "default" },
  }
);

interface AvatarRootProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarRootProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

interface AvatarStatusProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: "online" | "offline" | "busy";
}

function AvatarStatus({ status = "online", className, ...props }: AvatarStatusProps) {
  const colorClass =
    status === "online"
      ? "bg-[color:var(--success-color)]"
      : status === "busy"
        ? "bg-[color:var(--danger-color)]"
        : "bg-text-muted";
  return (
    <span
      aria-hidden
      className={cn(
        "absolute bottom-0 right-0 size-[11px] rounded-full border-2 border-background",
        colorClass,
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarStatus, avatarVariants };
