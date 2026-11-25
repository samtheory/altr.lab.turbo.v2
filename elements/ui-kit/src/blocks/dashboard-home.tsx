"use client";

import * as React from "react";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type DashboardMetric = {
  label: string;
  value: string;
  delta?: string;
};

export type DashboardRecentItem = {
  id: string;
  title: string;
  meta?: string;
};

export type DashboardHomeProps = {
  metrics?: DashboardMetric[];
  recent?: DashboardRecentItem[];
  className?: string;
};

const defaultMetrics: DashboardMetric[] = [
  { label: "Active users", value: "2,847", delta: "+12%" },
  { label: "MRR", value: "$48.2k", delta: "+8%" },
  { label: "Churn", value: "1.2%", delta: "-0.3%" },
];

const defaultRecent: DashboardRecentItem[] = [
  { id: "1", title: "Acme onboarded", meta: "2m ago" },
  { id: "2", title: "Export completed", meta: "18m ago" },
  { id: "3", title: "New workspace created", meta: "1h ago" },
];

/** Compact dashboard chrome mock for marketing previews. */
export function DashboardHome({
  metrics = defaultMetrics,
  recent = defaultRecent,
  className,
}: DashboardHomeProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      data-slot="dashboard-home"
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex min-h-[18rem]">
        <aside
          className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-border/80 bg-muted/30 py-4 sm:flex"
          aria-hidden
        >
          <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <LayoutDashboard className="size-4" />
          </span>
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
        </aside>

        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Home</h3>
              <p className="text-xs text-muted-foreground">Preview · not live data</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3 text-primary" aria-hidden />
              Live
            </span>
          </header>

          <ul className="mb-6 grid gap-3 sm:grid-cols-3">
            {metrics.map((m) => (
              <li
                key={m.label}
                className="rounded-xl border border-border/70 bg-background/60 px-4 py-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{m.value}</p>
                {m.delta ? (
                  <p className="text-xs text-success">{m.delta}</p>
                ) : null}
              </li>
            ))}
          </ul>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent activity
            </h4>
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm hover:border-border/60 hover:bg-muted/30"
                >
                  <span className="truncate font-medium">{item.title}</span>
                  {item.meta ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}