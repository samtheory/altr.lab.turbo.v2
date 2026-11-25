"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type LampGlowProps = {
  className?: string;
  children?: React.ReactNode;
};

export function LampGlow({ className, children }: LampGlowProps) {
  const reduce = useReducedMotion();

  return (
    <PatternFrame
      data-slot="lamp-glow"
      className={cn("bg-background", className)}
      pattern={
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "absolute top-0 left-1/2 h-[55%] w-[70%] -translate-x-1/2 rounded-b-[100%] bg-primary/30 blur-3xl",
              !reduce && "apolyx-lamp-pulse",
            )}
            aria-hidden
          />
          <div
            className="absolute top-0 left-1/2 h-px w-[42%] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
            aria-hidden
          />
          <div
            className={cn(
              "absolute top-0 left-1/2 h-[38%] w-[28%] -translate-x-1/2 bg-gradient-to-b from-primary/35 via-primary/10 to-transparent",
              !reduce && "apolyx-lamp-cone",
            )}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent"
            aria-hidden
          />
        </div>
      }
    >
      {children}
    </PatternFrame>
  );
}
