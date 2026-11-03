"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type SegmentedOption = {
  value: string;
  label: React.ReactNode;
  "aria-label"?: string;
};

export type SegmentedControlProps = {
  options: readonly SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
};

/** Single-choice radio group rendered as joined buttons. Arrow keys move + select (roving tabindex). */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;
    e.preventDefault();
    refs.current[next]?.focus();
    onValueChange(options[next]!.value);
  }
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="segmented-control"
      className={cn("inline-flex items-center gap-1 rounded-md bg-muted p-1", className)}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o["aria-label"]}
            tabIndex={checked ? 0 : -1}
            data-state={checked ? "on" : "off"}
            onClick={() => onValueChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "rounded-[calc(var(--radius)-2px)] px-3 py-1 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              checked
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-accent-hover/60 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
