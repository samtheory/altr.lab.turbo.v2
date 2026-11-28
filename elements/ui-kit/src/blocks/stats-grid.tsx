"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { PatternDots } from "../components/ui/pattern-dots";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type StatsGridItem = {
  label: string;
  value: string | number;
  suffix?: string;
};

export type StatsGridProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  items?: StatsGridItem[];
  background?: "dots" | "grid" | "none";
  className?: string;
};

const defaultItems: StatsGridItem[] = [
  { label: "Active teams", value: 2400, suffix: "+" },
  { label: "Blocks shipped", value: 120, suffix: "+" },
  { label: "Uptime", value: "99.9", suffix: "%" },
  { label: "Median latency", value: 42, suffix: "ms" },
];

function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-2xl opacity-40",
        "bg-[linear-gradient(oklch(from_var(--border)_l_c_h_/_0.65)_1px,transparent_1px),linear-gradient(90deg,oklch(from_var(--border)_l_c_h_/_0.65)_1px,transparent_1px)]",
        "bg-size-[24px_24px]",
        className,
      )}
      aria-hidden
    />
  );
}

/** Marketing stats row over a subtle dot or line grid background. */
export function StatsGrid({
  title = "Numbers that compound",
  description = "Ship blocks faster without sacrificing craft — the kit handles motion, tokens, and accessibility defaults.",
  items = defaultItems,
  background = "dots",
  className,
}: StatsGridProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  const stats = (
    <ul className="relative z-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <motion.li
          key={item.label}
          className="text-center sm:text-left"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl">
            {item.value}
            {item.suffix ? (
              <span className="text-2xl text-muted-foreground sm:text-3xl">{item.suffix}</span>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
        </motion.li>
      ))}
    </ul>
  );

  const inner = (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-border bg-card/40 px-6 py-10 sm:px-10">
      {background === "grid" ? <GridBackdrop /> : null}
      <div className="relative z-10 space-y-8">
        {(title || description) && (
          <header className="mx-auto max-w-2xl text-center">
            {title ? (
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </header>
        )}
        {stats}
      </div>
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_55%,var(--background)_95%)]"
        aria-hidden
      />
    </div>
  );

  return (
    <section data-slot="stats-grid" className={cn("w-full", className)}>
      {background === "dots" ? (
        <PatternDots vignette className="rounded-2xl border border-border bg-muted/20">
          {inner}
        </PatternDots>
      ) : (
        inner
      )}
    </section>
  );
}