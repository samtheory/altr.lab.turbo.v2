"use client";

import * as React from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TraceBeamProps = {
  children: React.ReactNode;
  className?: string;
  beamClassName?: string;
};

export function TraceBeam({ children, className, beamClassName }: TraceBeamProps) {
  const reduce = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.35"],
  });

  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  const height = useTransform(smooth, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`);
  const dotY = useTransform(smooth, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`);

  return (
    <div
      ref={containerRef}
      data-slot="trace-beam"
      className={cn("relative w-full", className)}
    >
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 top-0 hidden w-px bg-border sm:block",
          beamClassName,
        )}
        aria-hidden
      >
        {!reduce ? (
          <>
            <motion.div
              className="absolute inset-x-0 top-0 w-px origin-top bg-[linear-gradient(180deg,var(--primary),color-mix(in_oklch,var(--primary)_40%,transparent))]"
              style={{ height }}
            />
            <motion.div
              className="absolute left-1/2 size-2.5 -translate-x-1/2 rounded-full border border-primary/40 bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
              style={{ top: dotY }}
            />
          </>
        ) : (
          <div
            className="absolute inset-x-0 top-0 h-full w-px bg-primary/50"
            aria-hidden
          />
        )}
      </div>
      <div className="sm:pl-8">{children}</div>
    </div>
  );
}