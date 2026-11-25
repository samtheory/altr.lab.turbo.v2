"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { VisuallyHidden } from "../../primitives/visually-hidden";

export type ForgeLoaderProps = {
  /** Status lines cycled while loading. */
  statuses?: string[];
  /** 0–100. Omit for indeterminate auto progress. */
  value?: number;
  /** Auto-run progress when `value` is omitted. */
  loading?: boolean;
  /** ms to reach ~100 when auto. */
  duration?: number;
  title?: string;
  completeLabel?: string;
  onComplete?: () => void;
  className?: string;
};

const DEFAULT_STATUSES = [
  "Gathering pixels",
  "Shaping composition",
  "Refining light",
  "Forging detail",
  "Polishing edges",
];

export function ForgeLoader({
  statuses = DEFAULT_STATUSES,
  value: valueProp,
  loading = true,
  duration = 5200,
  title = "Generating",
  completeLabel = "Ready",
  onComplete,
  className,
}: ForgeLoaderProps) {
  const reduce = useReducedMotion();
  const controlled = valueProp !== undefined;
  const [autoValue, setAutoValue] = React.useState(0);
  const [statusIndex, setStatusIndex] = React.useState(0);
  const value = controlled ? Math.min(100, Math.max(0, valueProp)) : autoValue;
  const complete = !loading || value >= 100;
  const status =
    complete ? completeLabel : (statuses[statusIndex % statuses.length] ?? title);

  React.useEffect(() => {
    if (controlled || !loading) return;
    if (reduce) {
      setAutoValue(100);
      onComplete?.();
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic with a soft plateau near the end.
      const eased = 1 - Math.pow(1 - t, 3);
      setAutoValue(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controlled, duration, loading, onComplete, reduce]);

  React.useEffect(() => {
    if (complete || reduce || statuses.length < 2) return;
    const t = window.setInterval(
      () => setStatusIndex((i) => (i + 1) % statuses.length),
      Math.max(700, duration / Math.max(statuses.length, 1)),
    );
    return () => window.clearInterval(t);
  }, [complete, duration, reduce, statuses.length]);

  const cells = React.useMemo(() => Array.from({ length: 48 }, (_, i) => i), []);

  return (
    <div
      data-slot="forge-loader"
      role="status"
      aria-busy={!complete}
      aria-live="polite"
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-5 text-foreground shadow-xs",
        className,
      )}
    >
      <VisuallyHidden>
        {complete ? completeLabel : `${title}: ${value}% — ${status}`}
      </VisuallyHidden>

      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      >
        <div className="absolute inset-0 grid grid-cols-8 gap-px p-3">
          {cells.map((i) => {
            const lit = !reduce && !complete && (i + statusIndex) % 7 === 0;
            return (
              <span
                key={i}
                className={cn(
                  "rounded-[2px] bg-muted/50",
                  lit && "bg-primary/35",
                  !reduce && "transition-colors duration-500",
                )}
              />
            );
          })}
        </div>
        {!reduce && !complete ? (
          <div className="apolyx-forge-sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        ) : null}
      </div>

      <div className="relative z-[1] flex items-center gap-4">
        <div className="relative grid size-16 shrink-0 place-items-center">
          <svg viewBox="0 0 100 100" className="size-16 -rotate-90" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              className="stroke-muted"
              strokeWidth="7"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-out"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - value / 100)}`}
            />
          </svg>
          <span className="absolute font-mono text-xs font-semibold tabular-nums">
            {value}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <div className="mt-1 h-5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={status}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: reduce ? 0 : 0.22 }}
                className="truncate text-xs text-muted-foreground"
              >
                {status}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-primary",
                !reduce && "transition-[width] duration-300 ease-out",
              )}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
