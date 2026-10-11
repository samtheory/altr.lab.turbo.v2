"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { useChart } from "./chart-container";

export function ChartLegend({ className }: { className?: string }) {
  const { config, hidden, toggleSeries } = useChart();
  return (
    <div
      data-slot="chart-legend"
      className={cn("mt-3 flex flex-wrap gap-2", className)}
    >
      {Object.entries(config).map(([key, meta]) => {
        const pressed = !hidden.has(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={pressed}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !pressed && "opacity-50",
            )}
            onClick={() => toggleSeries(key)}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: `var(--color-${key})` }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
