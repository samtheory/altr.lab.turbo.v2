"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type PixelRevealProps = {
  className?: string;
  revealed?: number;
  cols?: number;
  rows?: number;
};

export function PixelReveal({ className, revealed = 0.5, cols = 16, rows = 8 }: PixelRevealProps) {
  const cells = cols * rows;
  const cutoff = Math.floor(cells * revealed);

  return (
    <div
      data-slot="pixel-reveal"
      className={cn("grid gap-px bg-border p-px", className)}
      style={{ gridTemplateColumns: "repeat(" + cols + ", minmax(0,1fr))" }}
    >
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className={cn("aspect-square", i < cutoff ? "bg-primary/25" : "animate-pulse bg-muted")} />
      ))}
    </div>
  );
}