"use client";

import * as React from "react";

import { cn } from "../lib/utils";

export type ChartTooltipProps = {
  x: number;
  y: number;
  visible: boolean;
  label?: string;
  values?: { key: string; label: string; value: string | number }[];
  className?: string;
};

export function ChartTooltip({
  x,
  y,
  visible,
  label,
  values = [],
  className,
}: ChartTooltipProps) {
  if (!visible) return null;
  return (
    <div
      role="tooltip"
      data-slot="chart-tooltip"
      className={cn(
        "pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-md",
        className,
      )}
      style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 8px))" }}
    >
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      <ul className="space-y-0.5">
        {values.map((v) => (
          <li key={v.key} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ background: `var(--color-${v.key})` }}
            />
            <span className="text-muted-foreground">{v.label}</span>
            <span className="ml-auto font-mono">{v.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
