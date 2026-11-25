"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type SpotlightBeamProps = {
  className?: string;
  children?: React.ReactNode;
  /** Horizontal position of the beam origin (0–100). */
  x?: number;
  /** Beam width as % of container. */
  width?: number;
};

/** Page-scale spotlight beam wash from the top edge. */
export function SpotlightBeam({
  className,
  children,
  x = 50,
  width = 55,
}: SpotlightBeamProps) {
  const reduce = useReducedMotion();

  return (
    <PatternFrame
      data-slot="spotlight-beam"
      className={cn("bg-background", className)}
      pattern={
        <div className="absolute inset-0 overflow-hidden">
          <div
            aria-hidden
            className={cn(
              "absolute top-0 h-[85%] -translate-x-1/2",
              !reduce && "apolyx-spotlight-beam",
            )}
            style={{
              left: `${x}%`,
              width: `${width}%`,
              background: `linear-gradient(
                180deg,
                color-mix(in oklab, var(--primary) 45%, transparent) 0%,
                color-mix(in oklab, var(--primary) 18%, transparent) 35%,
                transparent 78%
              )`,
              clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
              filter: "blur(8px)",
              opacity: reduce ? 0.55 : 0.85,
            }}
          />
          <div
            aria-hidden
            className="absolute top-0 left-1/2 h-px w-[min(40%,18rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{ left: `${x}%` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,color-mix(in_oklab,var(--background)_90%,transparent)_75%)]"
          />
        </div>
      }
    >
      {children}
    </PatternFrame>
  );
}
