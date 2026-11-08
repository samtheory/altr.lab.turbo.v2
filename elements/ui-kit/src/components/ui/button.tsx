"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "../../lib/utils";
import { Slot } from "../../primitives/slot";

export const buttonTones = [
  "pending",
  "progress",
  "submitted",
  "review",
  "success",
  "failed",
  "expired",
] as const;

export type ButtonTone = (typeof buttonTones)[number];

export const buttonShines = ["rainbow", "iris", "ocean", "lime", "amber", "rose"] as const;

export type ButtonShine = (typeof buttonShines)[number];

const toneClass: Record<ButtonTone, string> = {
  pending: "[--status:var(--warning)]",
  progress: "[--status:var(--info)]",
  submitted: "[--status:var(--status-submitted)]",
  review: "[--status:var(--status-review)]",
  success: "[--status:var(--success)]",
  failed: "[--status:var(--destructive)]",
  expired: "[--status:var(--muted-foreground)]",
};

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-[0_0_0_1px_var(--primary-glow),0_6px_20px_-4px_var(--primary-glow)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover",
        outline:
          "border border-input bg-background hover:border-border-strong hover:bg-accent-hover hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost: "hover:bg-accent-hover hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:text-primary-hover hover:underline",
        shiny: "apolyx-shiny",
        status: "apolyx-status",
        "status-inset":
          "apolyx-status-inset shadow-[inset_0_0_0_2px_var(--status-wash)]",
      },
      size: {
        xs: "h-7 gap-1.5 rounded-[calc(var(--radius)-2px)] px-2.5 text-xs [&_svg]:size-3.5",
        "icon-xs": "size-7 rounded-[calc(var(--radius)-2px)] [&_svg]:size-3.5",
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        md: "h-10 px-4 py-2",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      tone: toneClass,
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Color of a `shiny` button. `rainbow` travels through several hues. */
  shine?: ButtonShine;
  ref?: React.Ref<HTMLButtonElement>;
}

function Button({
  className,
  variant,
  size,
  tone,
  shine,
  asChild = false,
  loading = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const status = variant === "status" || variant === "status-inset";
  const resolvedTone = status ? (tone ?? "pending") : tone;
  const content = loading ? (
    <>
      <Loader2 className="animate-spin" aria-hidden />
      {children}
    </>
  ) : (
    children
  );
  return (
    <Comp
      data-slot="button"
      data-tone={resolvedTone || undefined}
      data-shine={variant === "shiny" ? (shine ?? "rainbow") : undefined}
      className={cn(buttonVariants({ variant, size, tone: resolvedTone, className }))}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
