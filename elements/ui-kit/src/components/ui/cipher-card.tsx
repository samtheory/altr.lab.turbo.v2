"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

const HEX = "0123456789ABCDEF";

function randomGlyph() {
  let s = "";
  for (let i = 0; i < 4; i++) s += HEX[(Math.random() * 16) | 0];
  return s;
}

export type CipherCardProps = {
  children: React.ReactNode;
  className?: string;
  rows?: number;
  cols?: number;
};

export function CipherCard({ children, className, rows = 6, cols = 10 }: CipherCardProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const [glyphs, setGlyphs] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (hovered && !reduce) {
      setGlyphs(Array.from({ length: rows * cols }, () => randomGlyph()));
    }
  }, [hovered, reduce, rows, cols]);

  return (
    <div
      data-slot="cipher-card"
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
      onPointerEnter={() => !reduce && setHovered(true)}
      onPointerLeave={() => !reduce && setHovered(false)}
    >
      <div className="relative z-10 p-6">{children}</div>
      {!reduce && hovered ? (
        <div
          data-slot="cipher-card-matrix"
          aria-hidden
          className="absolute inset-0 z-20 grid gap-0.5 bg-background/85 p-3 font-mono text-[10px] leading-none text-primary/80 backdrop-blur-sm"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {glyphs.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}