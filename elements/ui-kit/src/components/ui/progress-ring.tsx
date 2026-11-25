"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type ProgressRingProps = {
  value?: number;
  max?: number;
  className?: string;
  strokeWidth?: number;
};

export function ProgressRing({ value = 0, max = 100, className, strokeWidth = 6 }: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <svg
      data-slot="progress-ring"
      viewBox="0 0 100 100"
      className={cn(className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <circle cx="50" cy="50" r={r} className="stroke-muted" strokeWidth={strokeWidth} fill="none" />
      <circle
        cx="50"
        cy="50"
        r={r}
        className="stroke-primary transition-[stroke-dashoffset] duration-300"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={dash + " " + c}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}