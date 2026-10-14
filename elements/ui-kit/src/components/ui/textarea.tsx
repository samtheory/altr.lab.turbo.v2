"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const textareaVariants = cva(
  [
    "flex w-full rounded-md border placeholder:text-muted-foreground",
    "transition-[border-color,box-shadow,background-color] duration-(--duration-slow) ease-(--ease-out) focus-visible:duration-(--duration-base)",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "[&[readonly]]:bg-muted/50 [&[readonly]]:text-muted-foreground",
    "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
  ],
  {
    variants: {
      size: {
        sm: "min-h-16 px-2.5 py-1.5 text-xs",
        md: "min-h-24 px-3 py-2 text-sm",
        lg: "min-h-32 px-4 py-3 text-base",
      },
      variant: {
        outline:
          "border-input bg-background shadow-sm hover:border-border-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        filled:
          "border-transparent bg-muted hover:border-border focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/25",
        underline:
          "rounded-none border-0 border-b border-input bg-transparent px-0.5 hover:border-border-strong focus-visible:border-ring",
        ghost:
          "border-transparent bg-transparent hover:bg-accent-hover/60 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/25",
      },
    },
    defaultVariants: { size: "md", variant: "outline" },
  },
);

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> &
  VariantProps<typeof textareaVariants> & {
    autoResize?: boolean;
    ref?: React.Ref<HTMLTextAreaElement>;
  };

export function Textarea({
  className,
  size,
  variant,
  autoResize = false,
  ref,
  onChange,
  ...props
}: TextareaProps) {
  const localRef = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = localRef.current;
    if (!el || !autoResize) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize]);

  React.useEffect(() => {
    resize();
  }, [resize, props.value]);

  return (
    <textarea
      ref={(node) => {
        localRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      data-slot="textarea"
      data-size={size ?? "md"}
      data-variant={variant ?? "outline"}
      className={cn(textareaVariants({ size, variant }), className)}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      {...props}
    />
  );
}
