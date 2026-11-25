"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type CursorGlowProps = {
  children?: React.ReactNode;
  className?: string;
};

export function CursorGlow({ children, className }: CursorGlowProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(180px circle at ${x}px ${y}px, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)`;

  return (
    <div
      data-slot="cursor-glow"
      className={cn("relative overflow-hidden", className)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
    >
      {!reduce ? <motion.div className="pointer-events-none absolute inset-0" style={{ background }} aria-hidden /> : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
