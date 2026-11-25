"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ShineFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function ShineFrame({ children, className }: ShineFrameProps) {
  const reduce = useReducedMotion();
  return (
    <div data-slot="shine-frame" className={cn("relative rounded-xl p-px", className)}>
      <div className={cn("absolute inset-0 rounded-xl", !reduce && "apolyx-shine-frame")} aria-hidden />
      <div className="relative rounded-[calc(var(--radius)-1px)] bg-card">{children}</div>
    </div>
  );
}
