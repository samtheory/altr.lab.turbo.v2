"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type KineticTextProps = { text: string; className?: string };

export function KineticText({ text, className }: KineticTextProps) {
  const reduce = useReducedMotion();

  return (
    <span data-slot="kinetic-text" className={cn("inline-flex", className)} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={ch + "-" + i}
          className="inline-block"
          animate={reduce ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 0.5, delay: i * 0.05, repeat: Infinity, repeatDelay: 1.2 }}
        >
          {ch === " " ? "\u00a0" : ch}
        </motion.span>
      ))}
    </span>
  );
}