"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  /** 0–100. Omit (or pass `undefined`) for indeterminate. */
  value?: number | null;
  max?: number;
  ref?: React.Ref<HTMLDivElement>;
};

export function Progress({
  className,
  value,
  max = 100,
  ref,
  ...props
}: ProgressProps) {
  const indeterminate = value == null;
  const clamped = indeterminate
    ? undefined
    : Math.min(max, Math.max(0, Number(value)));
  const percent =
    clamped == null || max <= 0 ? undefined : (clamped / max) * 100;

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : clamped}
      data-slot="progress"
      data-state={indeterminate ? "indeterminate" : "determinate"}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-(--duration-base) ease-(--ease-out)",
          indeterminate &&
            "absolute inset-y-0 w-1/3 animate-[apolyx-progress-indeterminate_1.2s_ease-in-out_infinite]",
        )}
        style={
          indeterminate
            ? undefined
            : { width: `${percent ?? 0}%` }
        }
      />
    </div>
  );
}
