"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type UsageBreakdownLine = {
  label: string;
  value: string;
};

export type UsageCardProps = {
  used?: number;
  limit?: number;
  label?: string;
  breakdown?: UsageBreakdownLine[];
  autoPlay?: boolean;
  className?: string;
};

/** Usage meter card with optional breakdown and animated fill. */
export function UsageCard({
  used = 72_400,
  limit = 100_000,
  label = "API usage",
  breakdown,
  autoPlay = true,
  className,
}: UsageCardProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const warn = pct >= 85;
  const animate = autoPlay && !reduce && inView;

  const lines: UsageBreakdownLine[] =
    breakdown ?? [
      { label: "Inference", value: "48.2k" },
      { label: "Storage", value: "18.1k" },
      { label: "Egress", value: "6.1k" },
    ];

  return (
    <motion.article
      ref={ref}
      data-slot="usage-card"
      className={cn(
        "w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <p className="text-xs tabular-nums text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </p>
      </header>

      <div
        className="mb-4 h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={`${label}: ${pct}%`}
      >
        <motion.div
          className={cn("h-full rounded-full", warn ? "bg-destructive" : "bg-primary")}
          initial={{ width: animate ? 0 : `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={
            animate ? { duration: 0.9, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }
          }
        />
      </div>

      <ul className="space-y-2 border-t border-border/60 pt-4">
        {lines.map((line) => (
          <li
            key={line.label}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-medium tabular-nums">{line.value}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}