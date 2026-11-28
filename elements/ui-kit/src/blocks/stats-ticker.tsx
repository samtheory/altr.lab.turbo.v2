"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { NumberTicker } from "../components/ui/number-ticker";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type StatsTickerItem = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
};

export type StatsTickerProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  items?: StatsTickerItem[];
  className?: string;
};

const defaultItems: StatsTickerItem[] = [
  { label: "Deployments / week", value: 12840, suffix: "+" },
  { label: "Avg. bundle saved", value: 34.2, suffix: "%", decimals: 1 },
  { label: "Design tokens", value: 180 },
  { label: "NPS", value: 72 },
];

/** Stats section with animated NumberTicker values. */
export function StatsTicker({
  title = "Momentum in motion",
  description = "Counts ease in when the section enters view — and respect prefers-reduced-motion instantly.",
  items = defaultItems,
  className,
}: StatsTickerProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      data-slot="stats-ticker"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card/50 px-6 py-12 sm:px-10",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(oklch(from_var(--border)_l_c_h_/_0.5)_1px,transparent_1px),linear-gradient(90deg,oklch(from_var(--border)_l_c_h_/_0.5)_1px,transparent_1px)] bg-size-[20px_20px] opacity-30"
        aria-hidden
      />
      <div className="relative z-10 space-y-10">
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
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.li
              key={item.label}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                <NumberTicker
                  value={item.value}
                  suffix={item.suffix ?? ""}
                  prefix={item.prefix ?? ""}
                  decimals={item.decimals ?? 0}
                />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}