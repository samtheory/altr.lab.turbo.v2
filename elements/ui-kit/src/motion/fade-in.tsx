"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "../lib/utils";
import { durations, easings } from "./tokens";
import { useReducedMotion } from "./use-reduced-motion";

export type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
};

export function FadeIn({
  className,
  children,
  delay = 0,
  y = 16,
  ...props
}: FadeInProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        duration: durations.slow,
        delay,
        ease: [...easings.out],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
