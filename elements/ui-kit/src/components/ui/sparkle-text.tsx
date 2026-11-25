"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SparkleTextProps = { children: React.ReactNode; className?: string };

export function SparkleText({ children, className }: SparkleTextProps) {
  const reduce = useReducedMotion();
  return (
    <span data-slot="sparkle-text" className={cn("relative inline-block", className)}>
      {children}
      {!reduce ? <span className="apolyx-sparkle-text pointer-events-none absolute -inset-1" aria-hidden /> : null}
    </span>
  );
}