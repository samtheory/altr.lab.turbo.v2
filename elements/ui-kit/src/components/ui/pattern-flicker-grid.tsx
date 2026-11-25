"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type PatternFlickerGridProps = {
  cols?: number;
  rows?: number;
  className?: string;
  children?: React.ReactNode;
};

export function PatternFlickerGrid({
  cols = 12,
  rows = 8,
  className,
  children,
}: PatternFlickerGridProps) {
  const reduce = useReducedMotion();
  const [lit, setLit] = React.useState<Set<number>>(() => new Set());

  React.useEffect(() => {
    if (reduce) return;
    const total = cols * rows;
    const tick = () => {
      const next = new Set<number>();
      const count = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        next.add(Math.floor(Math.random() * total));
      }
      setLit(next);
    };
    tick();
    const id = window.setInterval(tick, 280);
    return () => window.clearInterval(id);
  }, [cols, rows, reduce]);

  return (
    <PatternFrame
      data-slot="pattern-flicker-grid"
      className={className}
      pattern={
        <div
          className="grid h-full w-full gap-px p-px"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: cols * rows }, (_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-sm bg-foreground/5 transition-colors duration-200",
                lit.has(i) && "bg-primary/25",
              )}
            />
          ))}
        </div>
      }
    >
      {children}
    </PatternFrame>
  );
}