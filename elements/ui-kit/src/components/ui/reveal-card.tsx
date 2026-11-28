"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { durations, easings } from "../../motion/tokens";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type RevealCardProps = {
  children: React.ReactNode;
  reveal: React.ReactNode;
  className?: string;
};

export function RevealCard({ children, reveal, className }: RevealCardProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const show = reduce || hovered;

  return (
    <div
      data-slot="reveal-card"
      className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="relative z-10 p-6">{children}</div>
      {reduce ? (
        <div data-slot="reveal-card-hidden" className="border-t border-border bg-muted/40 p-6">
          {reveal}
        </div>
      ) : (
        <motion.div
          data-slot="reveal-card-hidden"
          className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-6 backdrop-blur-sm"
          initial={false}
          animate={{
            y: show ? "0%" : "100%",
            opacity: show ? 1 : 0,
          }}
          transition={{ duration: durations.base, ease: [...easings.out] }}
        >
          {reveal}
        </motion.div>
      )}
    </div>
  );
}