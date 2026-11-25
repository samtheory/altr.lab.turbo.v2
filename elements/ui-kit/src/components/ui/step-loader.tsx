"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { VisuallyHidden } from "../../primitives/visually-hidden";

export type StepLoaderStep = {
  label: string;
  description?: string;
};

export type StepLoaderProps = {
  steps: StepLoaderStep[];
  /** Controlled current index (0-based). Omit for auto-advance. */
  current?: number;
  defaultCurrent?: number;
  /** ms per step when auto-advancing. Default 1600. */
  duration?: number;
  /** Restart from 0 after the last step. */
  loop?: boolean;
  loading?: boolean;
  onComplete?: () => void;
  className?: string;
};

export function StepLoader({
  steps,
  current: currentProp,
  defaultCurrent = 0,
  duration = 1600,
  loop = false,
  loading = true,
  onComplete,
  className,
}: StepLoaderProps) {
  const reduce = useReducedMotion();
  const controlled = currentProp !== undefined;
  const [inner, setInner] = React.useState(defaultCurrent);
  const current = controlled ? currentProp : inner;
  const safe = Math.min(Math.max(current, 0), Math.max(steps.length - 1, 0));
  const done = !loading || safe >= steps.length - 1;
  const statusLabel = steps[safe]?.label ?? "Loading";

  React.useEffect(() => {
    if (controlled || !loading || reduce) return;
    if (safe >= steps.length - 1) {
      onComplete?.();
      if (!loop) return;
      const t = window.setTimeout(() => setInner(0), duration);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setInner((i) => i + 1), duration);
    return () => window.clearTimeout(t);
  }, [controlled, duration, loading, loop, onComplete, reduce, safe, steps.length]);

  React.useEffect(() => {
    if (!reduce || controlled || !loading) return;
    // Under reduced motion, jump to last step once.
    setInner(Math.max(steps.length - 1, 0));
    onComplete?.();
  }, [controlled, loading, onComplete, reduce, steps.length]);

  return (
    <div
      data-slot="step-loader"
      role="status"
      aria-busy={loading && !done}
      aria-live="polite"
      className={cn("w-full max-w-sm text-foreground", className)}
    >
      <VisuallyHidden>
        {loading ? `Loading: ${statusLabel}` : "Loading complete"}
      </VisuallyHidden>
      <ol className="grid gap-2">
        {steps.map((step, index) => {
          const state =
            index < safe ? "complete" : index === safe ? "active" : "pending";
          return (
            <li
              key={`${index}-${step.label}`}
              data-state={state}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,background-color,opacity] duration-300",
                state === "active" && "border-primary/40 bg-primary/5",
                state === "complete" && "border-border/70 bg-card/40",
                state === "pending" && "border-transparent opacity-45",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                  state === "complete" && "border-success/40 bg-success/15 text-success",
                  state === "active" && "border-primary/50 bg-primary/15 text-primary",
                  state === "pending" && "border-border bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                <AnimatePresence mode="wait" initial={false}>
                  {state === "complete" ? (
                    <motion.span
                      key="check"
                      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.18 }}
                    >
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </motion.span>
                  ) : state === "active" && !reduce ? (
                    <motion.span
                      key="pulse"
                      className="size-2 rounded-full bg-primary"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : (
                    <span key="num">{index + 1}</span>
                  )}
                </AnimatePresence>
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "active" && "text-foreground",
                    state === "complete" && "text-foreground/90",
                    state === "pending" && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                {step.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
