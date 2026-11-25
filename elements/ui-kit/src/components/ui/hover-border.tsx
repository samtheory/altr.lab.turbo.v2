"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Slot } from "../../primitives/slot";

export type HoverBorderProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  /** Border thickness in px. */
  thickness?: number;
  duration?: number;
};

/** Hover-driven rotating gradient border (button or wrapper). */
export function HoverBorder({
  asChild,
  className,
  children,
  thickness = 1,
  duration = 3,
  ...props
}: HoverBorderProps) {
  const reduce = useReducedMotion();
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="hover-border"
      className={cn(
        "group/hover-border relative inline-flex items-center justify-center rounded-full p-[length:var(--hb-thickness)]",
        className,
      )}
      style={{
        ["--hb-thickness" as string]: `${thickness}px`,
        ["--hb-duration" as string]: `${duration}s`,
      }}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-[inherit] opacity-70 transition-opacity duration-300",
          "bg-[conic-gradient(from_var(--hb-angle,0deg),transparent_25%,color-mix(in_oklab,var(--primary)_80%,transparent)_50%,transparent_75%)]",
          !reduce && "apolyx-hover-border group-hover/hover-border:opacity-100",
          reduce && "opacity-40",
        )}
      />
      <span
        className={cn(
          "relative z-[1] inline-flex w-full items-center justify-center rounded-[inherit]",
          "bg-background px-5 py-2 text-sm font-medium text-foreground",
        )}
      >
        {children}
      </span>
    </Comp>
  );
}
