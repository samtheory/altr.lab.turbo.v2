"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type FlipTextProps = {
  children: string;
  /** Seconds for one roll cycle */
  duration?: number;
  /** Seconds before first roll */
  delay?: number;
  loop?: boolean;
  /** Roll every letter together */
  together?: boolean;
  className?: string;
};

/** Letters roll forward like cubes in a wave (or together). */
export function FlipText({
  children,
  duration = 2.2,
  delay = 0,
  loop = true,
  together = false,
  className,
}: FlipTextProps) {
  const reduce = useReducedMotion();
  const words = children.split(" ");
  const total = Math.max(children.length, 1);
  const starts = words.map((_, w) =>
    words.slice(0, w).reduce((sum, word) => sum + word.length + 1, 0),
  );

  if (reduce) {
    return (
      <span className={cn("inline-block", className)} data-slot="flip-text">
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn("apolyx-flip-text inline-block", className)}
      style={{ perspective: "1000px" }}
      data-slot="flip-text"
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden>
        {words.map((word, w) => {
          const start = starts[w] ?? 0;
          return (
            <span key={w}>
              <span
                className="inline-block whitespace-nowrap"
                style={{ transformStyle: "preserve-3d" }}
              >
                {Array.from(word).map((char, i) => {
                  const wave =
                    Math.sin(((start + i) / total) * (Math.PI / 2)) * duration * 0.25;
                  return (
                    <span
                      key={i}
                      data-char={char}
                      className="apolyx-flip-text-char relative inline-block"
                      style={
                        {
                          "--flip-duration": `${duration}s`,
                          "--flip-delay": `${(together ? 0 : wave) + delay}s`,
                          "--flip-iteration": loop ? "infinite" : 1,
                        } as React.CSSProperties
                      }
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
              {w < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </span>
    </span>
  );
}
