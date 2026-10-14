import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * The control surface shared by Field and InputGroup: soft fill, hover, focus
 * bloom, invalid and disabled. Invalid comes from `data-invalid` or from any
 * child control with `aria-invalid="true"`.
 *
 * Default (`outline`) is borderless — a muted pad that blooms a soft ring on
 * focus. There is no bottom accent bar.
 */
export const controlBoxVariants = cva(
  [
    "group/control relative flex w-full items-stretch",
    "transition-[border-color,box-shadow,background-color,color] duration-(--duration-slow) ease-(--ease-out) focus-within:duration-(--duration-base)",
    "data-[invalid]:ring-destructive/30 has-[[aria-invalid=true]]:ring-destructive/30",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 has-[input:disabled,textarea:disabled]:opacity-50",
  ],
  {
    variants: {
      variant: {
        // Soft borderless pad — the default for every Field / InputGroup.
        outline: [
          "rounded-md border border-transparent bg-muted/55 shadow-none",
          "hover:bg-muted/80",
          "focus-within:bg-background focus-within:ring-[3px] focus-within:ring-ring/30 focus-within:shadow-[0_0_0_1px_color-mix(in_oklch,var(--ring)_35%,transparent)]",
          "data-[invalid]:bg-destructive/5 has-[[aria-invalid=true]]:bg-destructive/5",
          "data-[invalid]:focus-within:ring-destructive/30 has-[[aria-invalid=true]]:focus-within:ring-destructive/30",
        ],
        filled: [
          "rounded-md border border-transparent bg-muted hover:bg-muted/90",
          "focus-within:bg-background focus-within:ring-[3px] focus-within:ring-ring/30",
          "data-[invalid]:focus-within:ring-destructive/30 has-[[aria-invalid=true]]:focus-within:ring-destructive/30",
        ],
        underline: [
          "rounded-none border-0 border-b border-input bg-transparent hover:border-border-strong",
          "focus-within:border-ring",
        ],
        ghost: [
          "rounded-md border border-transparent bg-transparent hover:bg-accent-hover/50",
          "focus-within:bg-muted/40 focus-within:ring-[3px] focus-within:ring-ring/25",
        ],
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: { variant: "outline", shape: "default" },
  },
);

export type ControlSize = "sm" | "md" | "lg";
export type ControlVariant = NonNullable<VariantProps<typeof controlBoxVariants>["variant"]>;
export type ControlShape = NonNullable<VariantProps<typeof controlBoxVariants>["shape"]>;

/** Single-line control heights by size; read from the box's `data-size`. */
export const controlHeight =
  "h-10 group-data-[size=sm]/control:h-8 group-data-[size=lg]/control:h-11";
export const controlText =
  "text-sm group-data-[size=sm]/control:text-xs group-data-[size=lg]/control:text-base";

export type ControlBoxProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof controlBoxVariants> & {
    size?: ControlSize;
    ref?: React.Ref<HTMLDivElement>;
  };

export function ControlBox({
  className,
  variant,
  shape,
  size = "md",
  ref,
  ...props
}: ControlBoxProps) {
  return (
    <div
      ref={ref}
      data-size={size}
      data-variant={variant ?? "outline"}
      className={cn(controlBoxVariants({ variant, shape }), className)}
      {...props}
    />
  );
}
