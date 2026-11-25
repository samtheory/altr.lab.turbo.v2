"use client";

import type * as React from "react";
import { motion, useScroll, useVelocity, useTransform } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ScrollVelocityTextProps = { children: React.ReactNode; className?: string };

export function ScrollVelocityText({ children, className }: ScrollVelocityTextProps) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const skew = useTransform(velocity, [-2000, 0, 2000], [-6, 0, 6]);

  if (reduce) return <span className={cn(className)}>{children}</span>;

  return (
    <motion.span data-slot="scroll-velocity-text" style={{ skewX: skew }} className={cn("inline-block", className)}>
      {children}
    </motion.span>
  );
}