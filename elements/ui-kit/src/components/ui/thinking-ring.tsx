"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

const DOTS = 20;
const RADIUS = 8;
const SPEED = 2;

function radiusAt(angle: number, t: number) {
  const tri = 0.12 * Math.sin(3 * angle + 0.6) * Math.sin(t * 2.2);
  const oval = 0.08 * Math.sin(2 * angle) * Math.sin(t * 1.5 + 1.1);
  const drift = 0.04 * Math.sin(angle * 7) * Math.sin(t * 3.1);
  return RADIUS * (1 + tri + oval + drift);
}

function DotRing() {
  const reduce = useReducedMotion();
  const dots = React.useRef<(SVGCircleElement | null)[]>([]);

  React.useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = reduce ? 0 : ((now - start) / 1000) * SPEED;
      dots.current.forEach((dot, i) => {
        if (!dot) return;
        const angle = (i / DOTS) * Math.PI * 2;
        const r = radiusAt(angle, t);
        dot.setAttribute("cx", (Math.cos(angle) * r).toFixed(3));
        dot.setAttribute("cy", (Math.sin(angle) * r).toFixed(3));
      });
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [reduce]);

  return (
    <svg viewBox="-12 -12 24 24" className="size-7 text-muted-foreground" aria-hidden>
      {Array.from({ length: DOTS }, (_, i) => (
        <circle
          key={i}
          ref={(el) => {
            dots.current[i] = el;
          }}
          r={0.85}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export type ThinkingRingProps = {
  label?: string;
  className?: string;
};

/** Breathing dot ring + shimmering status label. */
export function ThinkingRing({
  label = "Agent thinking…",
  className,
}: ThinkingRingProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      data-slot="thinking-ring"
      className={cn("flex items-center justify-center gap-3 text-lg font-medium", className)}
    >
      <DotRing />
      <motion.span
        className="bg-[linear-gradient(90deg,var(--muted-foreground)_0%,var(--muted-foreground)_40%,var(--foreground)_50%,var(--muted-foreground)_60%,var(--muted-foreground)_100%)] bg-[length:250%_100%] bg-clip-text text-transparent"
        initial={{ backgroundPosition: "100% 0" }}
        animate={reduce ? undefined : { backgroundPosition: ["100% 0", "0% 0"] }}
        transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatDelay: 0.3 }}
      >
        {label}
      </motion.span>
    </div>
  );
}
