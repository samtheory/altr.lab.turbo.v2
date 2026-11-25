"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type BorderGlowProps = {
  className?: string;
  children: React.ReactNode;
  radius?: string;
  duration?: number;
};

/** Card wrapper with a traveling gradient on the border. */
export function BorderGlow({
  className,
  children,
  radius = "var(--radius)",
  duration = 5,
}: BorderGlowProps) {
  const reduce = useReducedMotion();

  return (
    <div
      data-slot="border-glow"
      className={cn("relative rounded-[length:var(--border-glow-radius)] p-px", className)}
      style={{
        ["--border-glow-radius" as string]: radius,
        ["--border-glow-duration" as string]: `${duration}s`,
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[length:var(--border-glow-radius)]",
          !reduce && "apolyx-border-glow",
        )}
        aria-hidden
      />
      <div className="relative rounded-[length:var(--border-glow-radius)] bg-card">
        {children}
      </div>
    </div>
  );
}