"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type CubeFieldProps = {
  cols?: number;
  rows?: number;
  className?: string;
  children?: React.ReactNode;
};

export function CubeField({
  cols = 14,
  rows = 8,
  className,
  children,
}: CubeFieldProps) {
  const reduce = useReducedMotion();
  const root = React.useRef<HTMLDivElement>(null);
  const [focus, setFocus] = React.useState<{ x: number; y: number } | null>(null);

  const onMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduce) return;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * (cols - 1);
      const y = ((e.clientY - r.top) / r.height) * (rows - 1);
      setFocus({ x, y });
    },
    [cols, reduce, rows],
  );

  const cells = React.useMemo(
    () => Array.from({ length: cols * rows }, (_, i) => i),
    [cols, rows],
  );

  return (
    <PatternFrame
      data-slot="cube-field"
      className={cn("bg-background text-primary", className)}
      patternClassName="pointer-events-auto"
      pattern={
        <div
          ref={root}
          onPointerMove={onMove}
          onPointerLeave={() => setFocus(null)}
          className="absolute inset-0 grid [perspective:1000px] [transform-style:preserve-3d]"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            transform: "rotateX(52deg) rotateZ(-28deg) scale(1.15)",
            transformOrigin: "center 65%",
          }}
        >
          {cells.map((i) => {
            const x = i % cols;
            const y = Math.floor(i / cols);
            const dist = focus == null ? 99 : Math.hypot(x - focus.x, y - focus.y);
            const lift = reduce ? 0 : Math.max(0, 1 - dist / 3.2);
            return (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "m-px rounded-[3px] border border-border/80 bg-card/50",
                  !reduce && "transition-[transform,box-shadow,background-color] duration-200 ease-out",
                )}
                style={{
                  transform: `translateZ(${lift * 28}px) scale(${1 + lift * 0.08})`,
                  backgroundColor:
                    lift > 0.05
                      ? `color-mix(in oklab, var(--primary) ${Math.round(lift * 40)}%, var(--card))`
                      : undefined,
                  boxShadow:
                    lift > 0.2
                      ? `0 ${lift * 10}px ${lift * 20}px -6px color-mix(in oklab, var(--primary) 45%, transparent)`
                      : undefined,
                }}
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
