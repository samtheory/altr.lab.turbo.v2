"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ThinkingWaveProps = {
  label?: string;
  bars?: number;
  className?: string;
};

/** Equalizer-style thinking bars with a status label. */
export function ThinkingWave({
  label = "Thinking…",
  bars = 5,
  className,
}: ThinkingWaveProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      data-slot="thinking-wave"
      className={cn("flex items-center gap-3 text-sm font-medium text-muted-foreground", className)}
    >
      <span className="flex h-5 items-end gap-0.5" aria-hidden>
        {Array.from({ length: bars }, (_, i) => (
          <motion.span
            key={i}
            className="w-1 rounded-full bg-foreground/70"
            initial={{ height: 4 }}
            animate={
              reduce
                ? { height: 8 + (i % 3) * 4 }
                : { height: [4, 16, 6, 14, 4] }
            }
            transition={
              reduce
                ? { duration: 0 }
                : {
                    duration: 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.12,
                  }
            }
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
