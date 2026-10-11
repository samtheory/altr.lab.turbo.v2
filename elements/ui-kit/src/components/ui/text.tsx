import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const textVariants = cva("", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "default",
  },
});

export type TextProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    as?: "p" | "span" | "div";
    ref?: React.Ref<HTMLElement>;
  };

export function Text({
  as: Comp = "p",
  className,
  size,
  tone,
  ref,
  ...props
}: TextProps) {
  return (
    <Comp
      ref={ref as never}
      data-slot="text"
      className={cn(textVariants({ size, tone }), className)}
      {...props}
    />
  );
}

const headingVariants = cva("font-display font-semibold tracking-tight", {
  variants: {
    size: {
      sm: "text-lg",
      md: "text-2xl",
      lg: "text-3xl",
      xl: "text-4xl",
    },
  },
  defaultVariants: { size: "md" },
});

export type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof headingVariants> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    ref?: React.Ref<HTMLHeadingElement>;
  };

export function Heading({
  as,
  className,
  size,
  ref,
  ...props
}: HeadingProps) {
  const Comp = as ?? "h2";
  return (
    <Comp
      ref={ref}
      data-slot="heading"
      className={cn(headingVariants({ size }), className)}
      {...props}
    />
  );
}
