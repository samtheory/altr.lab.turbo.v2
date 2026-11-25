"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type VoiceOrbProps = {
  /** Normalized voice level from 0 to 1. */
  level?: number;
  size?: number;
  label?: string;
  className?: string;
};

/** Standalone pulsing orb driven by a 0–1 voice level. */
export function VoiceOrb({
  level = 0.35,
  size = 120,
  label = "Voice level",
  className,
}: VoiceOrbProps) {
  const reduce = useReducedMotion() ?? false;
  const clamped = Math.min(1, Math.max(0, level));
  const core = size * (0.42 + clamped * 0.18);
  const glow = size * (0.55 + clamped * 0.35);

  return (
    <div
      data-slot="voice-orb"
      role="img"
      aria-label={label}
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <motion.span
        aria-hidden
        className="absolute rounded-full bg-primary/20"
        animate={
          reduce
            ? { width: glow, height: glow, opacity: 0.35 + clamped * 0.25 }
            : {
                width: [glow * 0.92, glow, glow * 0.94],
                height: [glow * 0.92, glow, glow * 0.94],
                opacity: [0.2 + clamped * 0.2, 0.35 + clamped * 0.35, 0.22 + clamped * 0.2],
              }
        }
        transition={
          reduce ? undefined : { duration: 1.1 + (1 - clamped) * 0.4, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ width: glow, height: glow }}
      />
      <motion.span
        aria-hidden
        className="absolute rounded-full bg-primary/30 blur-md"
        animate={reduce ? undefined : { scale: [1, 1.05 + clamped * 0.12, 1] }}
        transition={reduce ? undefined : { duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: core * 1.15, height: core * 1.15 }}
      />
      <span
        className="relative z-10 rounded-full bg-primary shadow-[0_0_24px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
        style={{ width: core, height: core }}
      />
      <span className="sr-only">{`${Math.round(clamped * 100)}% level`}</span>
    </div>
  );
}