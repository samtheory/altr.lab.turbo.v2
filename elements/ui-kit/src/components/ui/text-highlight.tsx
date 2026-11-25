"use client";

import * as React from "react";
import { useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TextHighlightProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
};

/** Inline marker that sweeps behind a phrase once in view. */
export function TextHighlight({
  children,
  delay = 300,
  duration = 1400,
  className,
}: TextHighlightProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const shown = reduce || inView;
  const ease = reduce
    ? "0ms linear"
    : `${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`;

  return (
    <span
      ref={ref}
      data-slot="text-highlight"
      className={cn(
        "relative rounded-md bg-no-repeat py-0.5 whitespace-nowrap [box-decoration-break:clone]",
        className,
      )}
      style={{
        backgroundImage: "linear-gradient(var(--warning), var(--warning))",
        backgroundSize: shown ? "100% 100%" : "0% 100%",
        backgroundPosition: "0 0",
        transition: `background-size ${ease}`,
      }}
    >
      <span
        className="inline-block px-1.5"
        style={{
          color: "var(--foreground)",
          clipPath: shown ? "inset(0 0 0 100%)" : "inset(0 0 0 0)",
          transition: `clip-path ${ease}`,
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 px-1.5 py-0.5 leading-[normal]"
        style={{
          color: "var(--warning-foreground)",
          clipPath: shown ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: `clip-path ${ease}`,
        }}
      >
        {children}
      </span>
    </span>
  );
}
