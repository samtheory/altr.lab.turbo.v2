"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type StarfieldProps = {
  stars?: number;
  meteors?: number;
  className?: string;
  children?: React.ReactNode;
};

export function Starfield({
  stars = 80,
  meteors = 8,
  className,
  children,
}: StarfieldProps) {
  const reduce = useReducedMotion();

  const starPts = React.useMemo(
    () =>
      Array.from({ length: stars }, (_, i) => ({
        id: i,
        left: `${(i * 47) % 100}%`,
        top: `${(i * 31) % 100}%`,
        size: 1 + (i % 3),
        delay: (i % 7) * 0.35,
      })),
    [stars],
  );

  const showers = React.useMemo(
    () =>
      Array.from({ length: meteors }, (_, i) => ({
        id: i,
        left: `${(i * 23) % 90}%`,
        delay: (i % 5) * 1.1,
      })),
    [meteors],
  );

  return (
    <PatternFrame
      data-slot="starfield"
      className={cn("bg-background text-foreground", className)}
      pattern={
        <div className="absolute inset-0 overflow-hidden">
          {starPts.map((s) => (
            <span
              key={s.id}
              aria-hidden
              className={cn(
                "absolute rounded-full bg-foreground/70",
                !reduce && "apolyx-star-twinkle",
              )}
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
          {!reduce
            ? showers.map((m) => (
                <span
                  key={m.id}
                  aria-hidden
                  className="apolyx-meteor absolute top-0 h-px w-20 rotate-[215deg] bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  style={{ left: m.left, animationDelay: `${m.delay}s` }}
                />
              ))
            : null}
        </div>
      }
    >
      {children}
    </PatternFrame>
  );
}
