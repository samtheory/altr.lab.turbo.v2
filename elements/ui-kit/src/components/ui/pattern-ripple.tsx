"use client";

import { cn } from "../../lib/utils";
import { PatternFrame } from "./pattern-frame";

export type PatternRippleProps = {
  rings?: number;
  className?: string;
  children?: React.ReactNode;
};

export function PatternRipple({
  rings = 4,
  className,
  children,
}: PatternRippleProps) {
  return (
    <PatternFrame
      data-slot="pattern-ripple"
      className={cn("min-h-32", className)}
      pattern={
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: rings }, (_, i) => (
            <span
              key={i}
              className="absolute rounded-full border border-foreground/10 apolyx-pattern-ripple"
              style={{
                width: `${(i + 1) * 28}%`,
                height: `${(i + 1) * 28}%`,
                animationDelay: `${i * 0.55}s`,
              }}
            />
          ))}
        </div>
      }
    >
      {children}
    </PatternFrame>
  );
}