"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type OrbitRingProps = {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  radius?: number;
};

export function OrbitRing({ children, className, duration = 18, radius = 72 }: OrbitRingProps) {
  const reduce = useReducedMotion();
  const items = React.Children.toArray(children);
  const n = Math.max(items.length, 1);
  return (
    <div data-slot="orbit-ring" className={cn("relative grid place-items-center", className)} style={{ ["--orbit-r" as string]: radius + "px", ["--orbit-dur" as string]: duration + "s" }}>
      <div className="relative z-10 size-12 rounded-full border border-border bg-muted/50" aria-hidden />
      {items.map((item, i) => (
        <div
          key={i}
          className={cn("absolute left-1/2 top-1/2", !reduce && "apolyx-orbit-item")}
          style={{ ["--orbit-i" as string]: i, ["--orbit-n" as string]: n }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
