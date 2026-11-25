"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ThinkingSparkleProps = {
  label?: string;
  className?: string;
};

/** Soft pulsing sparkle icon with status copy. */
export function ThinkingSparkle({
  label = "Composing…",
  className,
}: ThinkingSparkleProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      data-slot="thinking-sparkle"
      className={cn("inline-flex items-center gap-2 text-sm font-medium", className)}
    >
      <motion.span
        animate={reduce ? undefined : { rotate: [0, 12, -8, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="grid size-7 place-items-center rounded-lg bg-muted text-foreground"
      >
        <Sparkles className="size-3.5" aria-hidden />
      </motion.span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
