"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type GlowFrameProps = {
  children: React.ReactNode;
  className?: string;
  /** Soft outer bloom intensity 0–1. */
  bloom?: number;
  /** Traveling border when motion is allowed. */
  border?: boolean;
  radius?: string;
};

/** Unified frame: soft outer glow + optional traveling border. */
export function GlowFrame({
  children,
  className,
  bloom = 0.55,
  border = true,
  radius = "1rem",
}: GlowFrameProps) {
  const reduce = useReducedMotion();

  return (
    <div
      data-slot="glow-frame"
      className={cn("relative", className)}
      style={{ ["--glow-frame-radius" as string]: radius }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[calc(var(--glow-frame-radius)+1rem)] blur-2xl"
        style={{
          background: `radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--primary) ${Math.round(bloom * 35)}%, transparent), transparent 70%)`,
          opacity: reduce ? 0.45 : 1,
        }}
      />
      <div
        className={cn(
          "relative rounded-[length:var(--glow-frame-radius)] p-px",
          border && !reduce && "apolyx-glow-frame-border",
        )}
      >
        {!border || reduce ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[length:var(--glow-frame-radius)] ring-1 ring-border/80"
          />
        ) : null}
        <div className="relative rounded-[calc(var(--glow-frame-radius)-1px)] bg-card">
          {children}
        </div>
      </div>
    </div>
  );
}
