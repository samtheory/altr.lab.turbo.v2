import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/** Native types styled in the base: file, color, range, date / time, number, search. */
const nativeTypes = [
  // file: the picker button reads as a small secondary button inside the box
  "file:mr-3 file:h-[calc(100%-0.5rem)] file:cursor-pointer file:rounded-[calc(var(--radius)-4px)] file:border-0 file:bg-secondary file:px-2.5 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary-hover",
  "[&[type=file]]:cursor-pointer [&[type=file]]:py-1 [&[type=file]]:pl-1 [&[type=file]]:text-muted-foreground",
  // color: the swatch fills the box
  "[&[type=color]]:cursor-pointer [&[type=color]]:p-1 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[calc(var(--radius)-4px)] [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-[calc(var(--radius)-4px)] [&::-moz-color-swatch]:border-0",
  // range: token track and thumb, no box
  "[&[type=range]]:cursor-pointer [&[type=range]]:appearance-none [&[type=range]]:border-0 [&[type=range]]:bg-transparent [&[type=range]]:px-0 [&[type=range]]:shadow-none",
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-input",
  "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_1px_3px_oklch(0_0_0/0.3)]",
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-input [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary",
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary",
  // date / time: tinted picker icon, theme-aware popup
  "dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-55 hover:[&::-webkit-calendar-picker-indicator]:opacity-90",
  // number / search: the kit replaces the native spinners and cancel button
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&[type=number]]:[appearance:textfield]",
  "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
];

export const inputVariants = cva(
  [
    "flex w-full min-w-0 rounded-md border placeholder:text-muted-foreground",
    "transition-[border-color,box-shadow,background-color,background-size] duration-(--duration-slow) ease-(--ease-out) focus-visible:duration-(--duration-base)",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&[readonly]]:bg-muted/50 [&[readonly]]:text-muted-foreground",
    "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
    ...nativeTypes,
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-11 px-4 text-base",
      },
      variant: {
        outline:
          "border-input bg-background shadow-sm hover:border-border-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        filled:
          "border-transparent bg-muted hover:border-border focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/25",
        // The focus bar grows from the centre: a gradient sized 0 → 100% (inputs cannot host ::after).
        underline:
          "rounded-none border-0 border-b border-input bg-transparent bg-[linear-gradient(var(--primary),var(--primary))] bg-[length:0%_2px] bg-[position:50%_100%] bg-no-repeat px-0.5 hover:border-border-strong focus-visible:border-ring focus-visible:bg-[length:100%_2px] aria-invalid:bg-[linear-gradient(var(--destructive),var(--destructive))]",
        ghost:
          "border-transparent bg-transparent hover:bg-accent-hover/60 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/25",
      },
      shape: {
        default: "",
        pill: "rounded-full px-4",
      },
    },
    defaultVariants: { size: "md", variant: "outline", shape: "default" },
  },
);

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof inputVariants> & {
    /** Native `size` attribute (visible character width). */
    htmlSize?: number;
    ref?: React.Ref<HTMLInputElement>;
  };

export function Input({
  className,
  type,
  size,
  variant,
  shape,
  htmlSize,
  ref,
  ...props
}: InputProps) {
  return (
    <input
      ref={ref}
      type={type}
      size={htmlSize}
      data-slot="input"
      data-size={size ?? "md"}
      data-variant={variant ?? "outline"}
      className={cn(inputVariants({ size, variant, shape }), className)}
      {...props}
    />
  );
}
