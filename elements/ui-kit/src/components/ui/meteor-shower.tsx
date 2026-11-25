"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type MeteorShowerProps = { className?: string; count?: number };

export function MeteorShower({ className, count = 12 }: MeteorShowerProps) {
  const reduce = useReducedMotion();
  const meteors = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 37) % 100 + "%",
        delay: (i % 5) * 0.7,
      })),
    [count],
  );

  return (
    <div data-slot="meteor-shower" className={cn("relative overflow-hidden", className)}>
      {!reduce
        ? meteors.map((m) => (
            <span
              key={m.id}
              className="apolyx-meteor absolute top-0 h-px w-16 rotate-[215deg] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              style={{ left: m.left, animationDelay: m.delay + "s" }}
              aria-hidden
            />
          ))
        : null}
    </div>
  );
}