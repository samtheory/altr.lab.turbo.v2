"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/*
  Geometry lives in CSS variables on the root so every part lines up without
  per-item class overrides:
  --tl-indicator  indicator diameter
  --tl-gap        space between the rail and the item content
  --tl-rail       x position of the rail's centre, measured from the item start
  --tl-offset     indicator top offset, centring it on the first 1.25rem text line
  --tl-tone(-fg)  fill colour for reached indicators and the progress line
*/

type TimelineOrientation = "vertical" | "horizontal";
type TimelineLayout = "stacked" | "split" | "alternate";
export type TimelineState = "completed" | "current" | "upcoming";

type TimelineContextValue = {
  value: number;
  orientation: TimelineOrientation;
  layout: TimelineLayout;
};

const TimelineContext = React.createContext<TimelineContextValue | null>(null);

function useTimeline() {
  const ctx = React.useContext(TimelineContext);
  if (!ctx) throw new Error("Timeline parts must be used within Timeline");
  return ctx;
}

type TimelineItemContextValue = { step: number; state: TimelineState };

const TimelineItemContext =
  React.createContext<TimelineItemContextValue | null>(null);

function useTimelineItem() {
  const ctx = React.useContext(TimelineItemContext);
  if (!ctx) throw new Error("Timeline item parts must be used within TimelineItem");
  return ctx;
}

const toneVariants = {
  primary: "[--tl-tone:var(--primary)] [--tl-tone-fg:var(--primary-foreground)]",
  success: "[--tl-tone:var(--success)] [--tl-tone-fg:var(--success-foreground)]",
  warning: "[--tl-tone:var(--warning)] [--tl-tone-fg:var(--warning-foreground)]",
  info: "[--tl-tone:var(--info)] [--tl-tone-fg:var(--info-foreground)]",
  destructive:
    "[--tl-tone:var(--destructive)] [--tl-tone-fg:var(--destructive-foreground)]",
  muted: "[--tl-tone:var(--muted-foreground)] [--tl-tone-fg:var(--background)]",
} as const;

export type TimelineTone = keyof typeof toneVariants;

const timelineVariants = cva(
  "group/timeline flex list-none p-0 [--tl-offset:calc((1.25rem_-_var(--tl-indicator))/2)]",
  {
    variants: {
      orientation: {
        vertical: "flex-col",
        horizontal: "flex-row",
      },
      size: {
        sm: "[--tl-indicator:0.625rem] [--tl-gap:0.75rem]",
        md: "[--tl-indicator:1rem] [--tl-gap:0.875rem]",
        lg: "[--tl-indicator:1.5rem] [--tl-gap:1rem]",
      },
      layout: {
        stacked: "[--tl-rail:calc(var(--tl-indicator)/2)]",
        split:
          "[--tl-gutter:7rem] [--tl-rail:calc(var(--tl-gutter)_+_var(--tl-indicator)/2)]",
        alternate: "[--tl-rail:50%]",
      },
      tone: toneVariants,
    },
    defaultVariants: {
      orientation: "vertical",
      size: "md",
      layout: "stacked",
      tone: "primary",
    },
  },
);

export type TimelineProps = Omit<React.OlHTMLAttributes<HTMLOListElement>, "type"> &
  VariantProps<typeof timelineVariants> & {
    /** Last reached step (controlled). Items with `step <= value` are completed. */
    value?: number;
    /** Last reached step when uncontrolled. `0` means nothing is reached yet. */
    defaultValue?: number;
    ref?: React.Ref<HTMLOListElement>;
  };

export function Timeline({
  value,
  defaultValue = 0,
  orientation,
  size,
  layout,
  tone,
  className,
  ref,
  ...props
}: TimelineProps) {
  const resolvedOrientation = orientation ?? "vertical";
  // Split / alternate place content around a vertical rail; a row has no sides.
  const resolvedLayout =
    resolvedOrientation === "horizontal" ? "stacked" : (layout ?? "stacked");
  const ctx = React.useMemo(
    () => ({
      value: value ?? defaultValue,
      orientation: resolvedOrientation,
      layout: resolvedLayout,
    }),
    [value, defaultValue, resolvedOrientation, resolvedLayout],
  );
  return (
    <TimelineContext.Provider value={ctx}>
      <ol
        ref={ref}
        data-slot="timeline"
        data-orientation={resolvedOrientation}
        data-layout={resolvedLayout}
        className={cn(
          timelineVariants({
            orientation: resolvedOrientation,
            size,
            layout: resolvedLayout,
            tone,
          }),
          className,
        )}
        {...props}
      />
    </TimelineContext.Provider>
  );
}

export type TimelineItemProps = React.LiHTMLAttributes<HTMLLIElement> & {
  /** 1-based position used to derive completed / current / upcoming. */
  step: number;
  /** Colours this item's indicator and the line leaving it. */
  tone?: TimelineTone;
  ref?: React.Ref<HTMLLIElement>;
};

export function TimelineItem({
  step,
  tone,
  className,
  ref,
  ...props
}: TimelineItemProps) {
  const { value, orientation, layout } = useTimeline();
  const state: TimelineState =
    step < value ? "completed" : step === value ? "current" : "upcoming";
  const item = React.useMemo(() => ({ step, state }), [step, state]);
  return (
    <TimelineItemContext.Provider value={item}>
      <li
        ref={ref}
        data-slot="timeline-item"
        data-state={state}
        data-completed={step <= value ? "" : undefined}
        aria-current={state === "current" ? "step" : undefined}
        className={cn(
          "group/timeline-item relative",
          tone && toneVariants[tone],
          orientation === "horizontal"
            ? "min-w-0 flex-1 pe-6 pt-[calc(var(--tl-indicator)_+_0.75rem)] last:pe-0"
            : "pb-8 last:pb-0",
          orientation === "vertical" &&
            layout !== "alternate" &&
            "ps-[calc(var(--tl-rail)_+_var(--tl-indicator)/2_+_var(--tl-gap))]",
          layout === "alternate" &&
            "odd:ps-[calc(50%_+_var(--tl-indicator)/2_+_var(--tl-gap))] even:pe-[calc(50%_+_var(--tl-indicator)/2_+_var(--tl-gap))] even:text-end",
          className,
        )}
        {...props}
      />
    </TimelineItemContext.Provider>
  );
}

export function TimelineHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="timeline-header"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
}

export function TimelineDate({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const { layout } = useTimeline();
  return (
    <time
      data-slot="timeline-date"
      className={cn(
        "block text-xs font-medium leading-5 tabular-nums text-muted-foreground",
        layout === "split" &&
          "absolute start-0 top-0 w-[calc(var(--tl-gutter)_-_1.25rem)] text-end",
        className,
      )}
      {...props}
    />
  );
}

export function TimelineTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="timeline-title"
      className={cn(
        "text-sm font-semibold leading-5 tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TimelineContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="timeline-content"
      className={cn("mt-1 text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}

const indicatorStateClasses: Record<TimelineState, string> = {
  upcoming: "border-border bg-background text-muted-foreground",
  completed: "border-(--tl-tone) bg-(--tl-tone) text-(--tl-tone-fg)",
  current:
    "border-(--tl-tone) bg-(--tl-tone) text-(--tl-tone-fg) shadow-[0_0_0_4px_color-mix(in_oklch,var(--tl-tone)_18%,transparent)]",
};

export type TimelineIndicatorProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** Overrides the item / root tone for this indicator only. */
  tone?: TimelineTone;
};

export function TimelineIndicator({
  tone,
  className,
  ...props
}: TimelineIndicatorProps) {
  const { orientation } = useTimeline();
  const { state } = useTimelineItem();
  return (
    <span
      aria-hidden
      data-slot="timeline-indicator"
      data-state={state}
      className={cn(
        "absolute z-10 flex size-(--tl-indicator) items-center justify-center rounded-full border-2",
        "transition-[background-color,border-color,color,box-shadow] duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none",
        "[&_svg]:size-[calc(var(--tl-indicator)*0.6)] [&_svg]:shrink-0",
        orientation === "horizontal"
          ? "start-0 top-0"
          : "start-[calc(var(--tl-rail)_-_var(--tl-indicator)/2)] top-(--tl-offset)",
        tone && toneVariants[tone],
        indicatorStateClasses[state],
        className,
      )}
      {...props}
    />
  );
}

export function TimelineSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const { orientation } = useTimeline();
  const { state } = useTimelineItem();
  const filled = state === "completed";
  const vertical = orientation === "vertical";
  return (
    <span
      aria-hidden
      data-slot="timeline-separator"
      className={cn(
        "absolute overflow-hidden rounded-full bg-border group-last/timeline-item:hidden",
        vertical
          ? "start-[calc(var(--tl-rail)_-_1px)] top-[calc(var(--tl-offset)_+_var(--tl-indicator)_+_0.25rem)] bottom-[calc(0.25rem_-_var(--tl-offset))] w-0.5"
          : "start-[calc(var(--tl-indicator)_+_0.25rem)] end-1 top-[calc(var(--tl-indicator)/2_-_1px)] h-0.5",
        className,
      )}
      {...props}
    >
      <span
        data-slot="timeline-separator-fill"
        className={cn(
          "absolute inset-0 bg-(--tl-tone) transition-transform duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none",
          vertical ? "origin-top" : "origin-left rtl:origin-right",
          vertical
            ? filled
              ? "scale-y-100"
              : "scale-y-0"
            : filled
              ? "scale-x-100"
              : "scale-x-0",
        )}
      />
    </span>
  );
}
