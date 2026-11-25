"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type HoverBoxesProps = {
  cols?: number;
  rows?: number;
  className?: string;
  children?: React.ReactNode;
};

export function HoverBoxes({
  cols = 16,
  rows = 10,
  className,
  children,
}: HoverBoxesProps) {
  const reduce = useReducedMotion();
  const root = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<{ x: number; y: number } | null>(null);

  const onMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduce) return;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * cols);
      const y = Math.floor(((e.clientY - r.top) / r.height) * rows);
      setActive({ x: Math.min(cols - 1, Math.max(0, x)), y: Math.min(rows - 1, Math.max(0, y)) });
    },
    [cols, reduce, rows],
  );

  const cells = React.useMemo(
    () => Array.from({ length: cols * rows }, (_, i) => i),
    [cols, rows],
  );

  return (
    <PatternFrame
      data-slot="hover-boxes"
      className={cn("bg-background", className)}
      patternClassName="pointer-events-auto"
      pattern={
        <div
          ref={root}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((i) => {
            const x = i % cols;
            const y = Math.floor(i / cols);
            const dist =
              active == null
                ? 99
                : Math.hypot(x - active.x, y - active.y);
            const lit = dist < 2.6;
            return (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "border border-border/50 bg-muted/20",
                  !reduce && "transition-[background-color,box-shadow,transform] duration-200",
                  lit && !reduce && "z-[1] scale-[1.04] bg-primary/25 shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
                  lit && reduce && "bg-primary/20",
                )}
              />
            );
          })}
        </div>
      }
    >
      {children}
    </PatternFrame>
  );
}
