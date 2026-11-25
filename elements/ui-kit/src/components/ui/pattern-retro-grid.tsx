"use client";

import { cn } from "../../lib/utils";
import { PatternFrame } from "./pattern-frame";

export type PatternRetroGridProps = {
  className?: string;
  children?: React.ReactNode;
};

/** Perspective floor grid — inspired by retro sci-fi backdrops. */
export function PatternRetroGrid({ className, children }: PatternRetroGridProps) {
  return (
    <PatternFrame
      data-slot="pattern-retro-grid"
      className={cn("min-h-24", className)}
      pattern={
        <div
          className={cn(
            "absolute inset-0 origin-[50%_100%]",
            "[transform:perspective(420px)_rotateX(58deg)_scale(1.6)]",
            "bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_12%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_12%,transparent)_1px,transparent_1px)]",
            "bg-size-[32px_32px]",
            "mask-[linear-gradient(to_top,black,transparent_72%)]",
            "apolyx-pattern-retro-drift",
          )}
        />
      }
    >
      {children}
    </PatternFrame>
  );
}