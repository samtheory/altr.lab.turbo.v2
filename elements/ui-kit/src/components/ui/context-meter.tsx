"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ContextMeterProps = {
  used?: number;
  limit?: number;
  label?: string;
  autoPlay?: boolean;
  className?: string;
};

/** Compact context-window usage meter. */
export function ContextMeter({
  used: usedProp = 48_200,
  limit = 128_000,
  label = "Context",
  autoPlay = false,
  className,
}: ContextMeterProps) {
  const reduce = useReducedMotion();
  const used = usedProp;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const warn = pct >= 80;

  return (
    <div
      data-slot="context-meter"
      className={cn(
        "inline-flex min-w-[12rem] flex-col gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-foreground shadow-xs",
        className,
      )}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={used}
      aria-label={`${label}: ${used.toLocaleString()} of ${limit.toLocaleString()} tokens`}
    >
      <div className="flex items-baseline justify-between gap-3 text-[11px]">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums text-muted-foreground", warn && "text-destructive")}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", warn ? "bg-destructive" : "bg-foreground")}
          initial={autoPlay && !reduce ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={
            autoPlay && !reduce
              ? { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0 }
          }
        />
      </div>
      <p className="text-[10px] tabular-nums text-muted-foreground">
        {used.toLocaleString()} / {limit.toLocaleString()}
      </p>
    </div>
  );
}
