"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type LayoutFlipProps = {
  words: string[];
  interval?: number;
  className?: string;
};

export function LayoutFlip({ words, interval = 2800, className }: LayoutFlipProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const word = words[index] ?? "";

  React.useEffect(() => {
    if (reduce || words.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [interval, reduce, words.length]);

  if (words.length === 0) return null;

  if (reduce) {
    return (
      <span data-slot="layout-flip" className={cn("inline-block font-semibold", className)}>
        {word}
      </span>
    );
  }

  return (
    <span
      data-slot="layout-flip"
      className={cn("relative inline-flex min-h-[1.2em] min-w-[4ch] overflow-hidden font-semibold", className)}
      style={{ perspective: "900px" }}
    >
      <span className="sr-only" aria-live="polite">
        {word}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word}
          layout
          initial={{ rotateX: 90, opacity: 0, y: 12 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          exit={{ rotateX: -90, opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block origin-bottom"
          aria-hidden
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}