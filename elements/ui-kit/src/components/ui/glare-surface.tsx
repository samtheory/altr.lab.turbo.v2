"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type GlareSurfaceProps = {
  children?: React.ReactNode;
  className?: string;
};

export function GlareSurface({ children, className }: GlareSurfaceProps) {
  const reduce = useReducedMotion();
  const px = useMotionValue(50);
  const py = useMotionValue(50);
  const sx = useSpring(px, { stiffness: 200, damping: 22 });
  const sy = useSpring(py, { stiffness: 200, damping: 22 });
  const glare = useMotionTemplate`radial-gradient(420px at ${sx}% ${sy}%, color-mix(in oklab, var(--background) 18%, transparent), transparent 62%)`;

  return (
    <motion.div
      data-slot="glare-surface"
      className={cn("relative overflow-hidden border border-border bg-card", className)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width) * 100);
        py.set(((e.clientY - r.top) / r.height) * 100);
      }}
    >
      {!reduce ? (
        <motion.div className="pointer-events-none absolute inset-0" style={{ background: glare }} aria-hidden />
      ) : null}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}