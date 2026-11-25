"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type MorphTextProps = { items: string[]; interval?: number; className?: string };

export function MorphText({ items, interval = 2400, className }: MorphTextProps) {
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (reduce || items.length < 2) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % items.length), interval);
    return () => window.clearInterval(id);
  }, [items.length, interval, reduce]);

  return (
    <span data-slot="morph-text" className={cn("relative inline-flex min-w-[6ch]", className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={items[i]}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {items[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}