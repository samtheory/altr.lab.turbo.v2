"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type GradientGlowCardProps = { children?: React.ReactNode; className?: string };

export function GradientGlowCard({ children, className }: GradientGlowCardProps) {
  const reduce = useReducedMotion();
  return (
    <div data-slot="gradient-glow-card" className={cn("relative rounded-xl p-px", className)}>
      <div
        className={cn(
          "absolute inset-0 rounded-xl bg-gradient-to-br from-primary via-info to-success opacity-70 blur-sm",
          reduce && "opacity-40",
        )}
        aria-hidden
      />
      <div className="relative rounded-[calc(var(--radius)-1px)] bg-card p-6">{children}</div>
    </div>
  );
}