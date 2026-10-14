import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * The bordered box shared by Field and InputGroup: border, hover, focus ring,
 * the bottom accent bar, invalid and disabled. Invalid comes from `data-invalid`
 * or from any child control with `aria-invalid="true"`.
 */
export const controlBoxVariants = cva(
  [
    "group/control relative flex w-full items-stretch",
    "transition-[border-color,box-shadow,background-color] duration-(--duration-slow) ease-(--ease-out) focus-within:duration-(--duration-base)",
    "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-(--duration-slow) after:ease-(--ease-out) focus-within:after:scale-x-100",
    "data-[invalid]:border-destructive has-[[aria-invalid=true]]:border-destructive",
    "data-[invalid]:after:bg-destructive has-[[aria-invalid=true]]:after:bg-destructive",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 has-[input:disabled,textarea:disabled]:opacity-50",
  ],
  {
    variants: {
      variant: {
        outline: [
          "rounded-md border border-input bg-background shadow-sm hover:border-border-strong",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
          "data-[invalid]:focus-within:ring-destructive/25 has-[[aria-invalid=true]]:focus-within:ring-destructive/25",
        ],
        filled: [
          "rounded-md border border-transparent bg-muted hover:border-border",
          "focus-within:border-ring focus-within:bg-background focus-within:ring-[3px] focus-within:ring-ring/20",
          "data-[invalid]:focus-within:ring-destructive/25 has-[[aria-invalid=true]]:focus-within:ring-destructive/25",
        ],
        underline: [
          "rounded-none border-0 border-b border-input bg-transparent hover:border-border-strong",
          "after:inset-x-0 focus-within:border-ring",
        ],
        ghost: [
          "rounded-md border border-transparent bg-transparent hover:bg-accent-hover/60",
          "focus-within:border-ring focus-within:bg-background focus-within:ring-[3px] focus-within:ring-ring/20",
        ],
      },
      shape: {
        default: "",
        pill: "rounded-full after:inset-x-5",
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
