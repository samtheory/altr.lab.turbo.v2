"use client";

import * as React from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type TheShiftColumn = {
  label: string;
  items: string[];
};

export type TheShiftProps = {
  title?: string;
  before?: TheShiftColumn;
  after?: TheShiftColumn;
  autoPlay?: boolean;
  className?: string;
};

const defaultBefore: TheShiftColumn = {
  label: "Before",
  items: ["One-off components", "Inconsistent motion", "Slow handoffs"],
};

const defaultAfter: TheShiftColumn = {
  label: "After",
  items: ["Shared Apolyx kit", "Tokenized themes", "Docs-ready blocks"],
};

/** Before/after comparison with a sliding highlight (static when reduced motion). */
export function TheShift({
  title = "The shift",
  before = defaultBefore,
  after = defaultAfter,
  autoPlay = true,
  className,
}: TheShiftProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const progress = useMotionValue(reduce ? 1 : 0);
  const highlightX = useTransform(progress, [0, 1], ["0%", "100%"]);

  React.useEffect(() => {
    if (reduce || !autoPlay || !inView) {
      progress.set(reduce ? 1 : 0);
      return;
    }
    const controls = animate(progress, [0, 1, 0.35, 1], {
      duration: 6,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 0.8,
    });
    return () => controls.stop();
  }, [reduce, autoPlay, inView, progress]);

  return (
    <section
      ref={ref}
      data-slot="the-shift"
      className={cn("space-y-6", className)}
    >
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="relative grid gap-4 md:grid-cols-2">
        <motion.div
          className="pointer-events-none absolute inset-y-2 z-10 w-1 rounded-full bg-primary shadow-[0_0_20px_var(--primary-glow)] md:left-1/2 md:-ml-px"
          style={{ x: reduce ? "-50%" : highlightX }}
          aria-hidden
        />

        <ColumnCard column={before} tone="muted" />
        <ColumnCard column={after} tone="primary" />
      </div>
    </section>
  );
}

function ColumnCard({
  column,
  tone,
}: {
  column: TheShiftColumn;
  tone: "muted" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6",
        tone === "primary"
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card/50",
      )}
    >
      <p
        className={cn(
          "mb-4 text-xs font-semibold uppercase tracking-wider",
          tone === "primary" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {column.label}
      </p>
      <ul className="space-y-2 text-sm">
        {column.items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                tone === "primary" ? "bg-primary" : "bg-muted-foreground",
              )}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}