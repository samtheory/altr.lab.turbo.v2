"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type ErrorRetryPhase = "failed" | "retrying" | "recovered" | "dismissed";

export type ErrorRetryProps = {
  title?: string;
  message?: string;
  stepLabel?: string;
  phase?: ErrorRetryPhase;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoPlay?: boolean;
  className?: string;
};

const HOLD = 2200;
const TICK = 50;

/** Failed step card with retry and dismiss callbacks. */
export function ErrorRetry({
  title = "Step failed",
  message = "The billing API returned a 503. The agent can retry or you can dismiss.",
  stepLabel = "charge_refund",
  phase: phaseProp = "failed",
  onRetry,
  onDismiss,
  autoPlay = false,
  className,
}: ErrorRetryProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const LOOP = HOLD * 4;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  React.useEffect(() => {
    if (!autoPlay || !visible || reduce) return;
    const id = setInterval(() => setTick((t) => (t + TICK) % LOOP), TICK);
    return () => clearInterval(id);
  }, [autoPlay, visible, reduce, LOOP]);

  let phase = phaseProp;
  if (autoPlay) {
    const p = Math.floor((reduce ? LOOP - 1 : tick) / HOLD);
    phase = (["failed", "retrying", "recovered", "dismissed"] as const)[p] ?? "failed";
  }

  const showActions = phase === "failed";

  return (
    <div
      ref={ref}
      data-slot="error-retry"
      data-phase={phase}
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        phase === "failed" && "border-destructive/30",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border border-border",
            phase === "recovered"
              ? "bg-success/10 text-success"
              : phase === "dismissed"
                ? "bg-muted text-muted-foreground"
                : "bg-destructive/10 text-destructive",
          )}
          aria-hidden
        >
          {phase === "retrying" ? (
            <RefreshCw className="size-4 animate-spin" strokeWidth={2.5} />
          ) : phase === "recovered" ? (
            <RefreshCw className="size-4" strokeWidth={2.5} />
          ) : (
            <AlertCircle className="size-4" strokeWidth={2.5} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{stepLabel}</p>
        </div>
      </div>
      <AnimatePresence initial={false} mode="wait">
        {showActions ? (
          <motion.div
            key="actions"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            className="flex gap-2"
          >
            <Button type="button" size="sm" className="flex-1 gap-1.5" onClick={onRetry}>
              <RefreshCw className="size-3.5" aria-hidden />
              Retry
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onDismiss}>
              <X className="size-3.5" aria-hidden />
              Dismiss
            </Button>
          </motion.div>
        ) : (
          <motion.p
            key="status"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "rounded-md px-3 py-2 text-center text-xs font-medium",
              phase === "retrying" && "bg-muted text-muted-foreground",
              phase === "recovered" && "bg-success/10 text-success",
              phase === "dismissed" && "bg-muted text-muted-foreground",
            )}
            role="status"
          >
            {phase === "retrying"
              ? "Retrying step…"
              : phase === "recovered"
                ? "Step recovered."
                : "Dismissed — agent will skip this step."}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}