"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type WordCycleProps = {
  words: string[];
  interval?: number;
  className?: string;
};

export function WordCycle({
  words,
  interval = 2800,
  className,
}: WordCycleProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (reduce || words.length < 2) return;
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setVisible(true);
      }, 220);
    }, interval);
    return () => window.clearInterval(id);
  }, [interval, reduce, words.length]);

  if (words.length === 0) return null;

  return (
    <span
      data-slot="word-cycle"
      className={cn(
        "inline-block transition-[opacity,transform,filter] duration-300",
        visible ? "opacity-100 blur-none" : "opacity-0 blur-[4px]",
        className,
      )}
    >
      {words[index]}
    </span>
  );
}