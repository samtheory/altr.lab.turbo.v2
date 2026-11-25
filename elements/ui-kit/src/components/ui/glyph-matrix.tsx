"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

const GLYPHS = "アイウエオカキ0123456789";

export type GlyphMatrixProps = { className?: string; columns?: number; rows?: number };

export function GlyphMatrix({ className, columns = 24, rows = 10 }: GlyphMatrixProps) {
  const reduce = useReducedMotion();
  const cells = React.useMemo(
    () =>
      Array.from({ length: columns * rows }, (_, i) => ({
        id: i,
        ch: GLYPHS[i % GLYPHS.length]!,
        delay: (i % 11) * 0.15,
      })),
    [columns, rows],
  );

  return (
    <div
      data-slot="glyph-matrix"
      className={cn("grid overflow-hidden font-mono text-[10px] leading-none", className)}
      style={{ gridTemplateColumns: "repeat(" + columns + ", minmax(0,1fr))" }}
    >
      {cells.map((c) => (
        <span
          key={c.id}
          className={cn(!reduce && "apolyx-glyph-flicker")}
          style={{ animationDelay: c.delay + "s" }}
        >
          {c.ch}
        </span>
      ))}
    </div>
  );
}