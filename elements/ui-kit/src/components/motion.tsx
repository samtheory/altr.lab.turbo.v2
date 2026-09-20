"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "../lib/utils";

export type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
};

/**
 * Simple entrance animation for marketing / hub surfaces.
 */
export function FadeIn({
  className,
  children,
  delay = 0,
  y = 16,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { motion };
