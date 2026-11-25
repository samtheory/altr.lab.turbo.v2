"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

const TONES = ["var(--primary)", "var(--success)", "var(--warning)", "var(--info)"];

export type ConfettiBurstProps = { className?: string; active?: boolean; count?: number };

export function ConfettiBurst({ className, active = true, count = 24 }: ConfettiBurstProps) {
  const reduce = useReducedMotion();
  const pieces = React.useMemo(
    () => Array.from({ length: count }, (_, i) => ({ id: i, x: Math.random() * 100, tone: i % 4 })),
    [count],
  );

  return (
    <div data-slot="confetti-burst" className={cn("pointer-events-none relative overflow-hidden", className)}>
      <AnimatePresence>
        {active && !reduce
          ? pieces.map((p) => (
              <motion.span
                key={p.id}
                className="absolute top-0 size-2 rounded-sm"
                initial={{ opacity: 1, y: 0, left: p.x + "%" }}
                animate={{ opacity: 0, y: 120, rotate: 180 }}
                transition={{ duration: 1.2, delay: p.id * 0.02 }}
                style={{ background: TONES[p.tone] }}
                aria-hidden
              />
            ))
          : null}
      </AnimatePresence>
    </div>
  );
}