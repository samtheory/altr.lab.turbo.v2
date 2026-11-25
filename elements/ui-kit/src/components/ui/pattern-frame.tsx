"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type PatternFrameProps = {
  className?: string;
  patternClassName?: string;
  children?: React.ReactNode;
  /** Decorative layer (SVG or canvas) — marked aria-hidden */
  pattern: React.ReactNode;
  "data-slot"?: string;
};

/** Stacks a full-bleed decorative layer behind relative content. */
export function PatternFrame({
  className,
  patternClassName,
  children,
  pattern,
  "data-slot": slot = "pattern-frame",
}: PatternFrameProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} data-slot={slot}>
      <div
        className={cn("pointer-events-none absolute inset-0", patternClassName)}
        aria-hidden
      >
        {pattern}
      </div>
      {children ? <div className="relative z-[1]">{children}</div> : null}
    </div>
  );
}