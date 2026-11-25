"use client";

import * as React from "react";
import { Coins } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type CostBreakdownLine = {
  id: string;
  label: string;
  tokens?: number;
  costUsd?: number;
  pct?: number;
};

export type CostTrackerProps = {
  title?: string;
  totalCostUsd?: number;
  totalTokens?: number;
  lines?: CostBreakdownLine[];
  autoPlay?: boolean;
  className?: string;
};

const DEMO_LINES: CostBreakdownLine[] = [
  { id: "in", label: "Input tokens", tokens: 18200, costUsd: 0.036, pct: 42 },
  { id: "out", label: "Output tokens", tokens: 9100, costUsd: 0.055, pct: 58 },
  { id: "tools", label: "Tool calls", tokens: 0, costUsd: 0.012, pct: 12 },
];

/** Token and cost usage breakdown meter for an agent session. */
export function CostTracker({
  title = "Session cost",
  totalCostUsd: totalCostProp,
  totalTokens: totalTokensProp,
  lines: linesProp,
  autoPlay = false,
  className,
}: CostTrackerProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const lines = linesProp ?? (autoPlay ? DEMO_LINES : []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  const totalCost =
    totalCostProp ??
    (lines.length > 0
      ? lines.reduce((sum, row) => sum + (row.costUsd ?? 0), 0)
      : autoPlay
        ? 0.103
        : 0);
  const totalTokens =
    totalTokensProp ??
    (lines.length > 0
      ? lines.reduce((sum, row) => sum + (row.tokens ?? 0), 0)
      : autoPlay
        ? 27300
        : 0);

  return (
    <div
      ref={ref}
      data-slot="cost-tracker"
      className={cn(
        "w-full max-w-sm rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Coins className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums">${totalCost.toFixed(3)}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {totalTokens.toLocaleString()} tokens
        </span>
      </div>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted">
        {lines.map((row, i) => (
          <motion.div
            key={row.id}
            className={cn(
              "h-full",
              i === 0 && "bg-foreground",
              i === 1 && "bg-primary",
              i >= 2 && "bg-muted-foreground",
            )}
            initial={autoPlay && visible && !reduce ? { width: 0 } : { width: `${row.pct ?? 0}%` }}
            animate={{ width: `${row.pct ?? 0}%` }}
            transition={
              autoPlay && visible && !reduce ? { duration: 0.6, delay: i * 0.08 } : { duration: 0 }
            }
            title={row.label}
          />
        ))}
      </div>
      <ul className="space-y-1.5 text-xs">
        {lines.map((row) => (
          <li key={row.id} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="tabular-nums font-medium">
              {row.tokens ? `${row.tokens.toLocaleString()} · ` : ""}$
              {(row.costUsd ?? 0).toFixed(3)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}