"use client";

import { cn } from "../../lib/utils";
import { PatternFrame } from "./pattern-frame";

export type PatternPulseGridProps = {
  cell?: number;
  className?: string;
  children?: React.ReactNode;
};

export function PatternPulseGrid({
  cell = 40,
  className,
  children,
}: PatternPulseGridProps) {
  return (
    <PatternFrame
      data-slot="pattern-pulse-grid"
      className={className}
      pattern={
        <div
          className={cn(
            "absolute inset-0",
            "bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_80%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_80%,transparent)_1px,transparent_1px)]",
            "apolyx-pattern-pulse-grid",
          )}
          style={{
            backgroundSize: `${cell}px ${cell}px`,
            ["--apolyx-grid-cell" as string]: `${cell}px`,
          }}
        />
      }
    >
      {children}
    </PatternFrame>
  );
}