"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type PixelCanvasProps = {
  className?: string;
  cols?: number;
  rows?: number;
  cellClassName?: string;
};

export function PixelCanvas({
  className,
  cols = 20,
  rows = 12,
  cellClassName,
}: PixelCanvasProps) {
  const reduce = useReducedMotion();
  const [lit, setLit] = React.useState<Set<number>>(() => new Set());
  const total = cols * rows;

  const brighten = React.useCallback(
    (clientX: number, clientY: number, el: HTMLDivElement) => {
      if (reduce) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cw = rect.width / cols;
      const ch = rect.height / rows;
      const col = Math.floor(x / cw);
      const row = Math.floor(y / ch);
      const next = new Set<number>();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const c = col + dc;
          const r = row + dr;
          if (c >= 0 && c < cols && r >= 0 && r < rows) {
            next.add(r * cols + c);
          }
        }
      }
      setLit(next);
    },
    [cols, reduce, rows],
  );

  return (
    <div
      data-slot="pixel-canvas"
      className={cn(
        "relative aspect-[5/3] w-full max-w-lg overflow-hidden rounded-xl border border-border bg-muted/30",
        className,
      )}
      onPointerMove={(e) => brighten(e.clientX, e.clientY, e.currentTarget)}
      onPointerLeave={() => setLit(new Set())}
    >
      <div
        className="grid h-full w-full gap-px bg-border p-px"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
        aria-hidden
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "bg-background/80 transition-colors duration-150",
              !reduce && lit.has(i) && "bg-primary/35",
              reduce && i % 7 === 0 && "bg-primary/15",
              cellClassName,
            )}
          />
        ))}
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-muted-foreground">
        {reduce ? "Static pixel grid" : "Move pointer to brighten cells"}
      </p>
    </div>
  );
}