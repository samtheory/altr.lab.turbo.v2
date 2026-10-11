"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { Skeleton } from "../components/ui/skeleton";
import type { ChartConfig } from "./types";
import { useResizeObserver } from "./use-resize-observer";

type ChartContextValue = {
  config: ChartConfig;
  width: number;
  height: number;
  hidden: Set<string>;
  toggleSeries: (key: string) => void;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

export function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within ChartContainer");
  return ctx;
}

export type ChartContainerProps = {
  config: ChartConfig;
  className?: string;
  aspectRatio?: number;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  "aria-label"?: string;
  children: React.ReactNode;
};

export function ChartContainer({
  config,
  className,
  aspectRatio = 16 / 9,
  loading,
  empty,
  emptyMessage = "No data",
  "aria-label": ariaLabel = "Chart",
  children,
}: ChartContainerProps) {
  const { ref, width, height } = useResizeObserver<HTMLDivElement>();
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());

  const style = React.useMemo(() => {
    const vars: React.CSSProperties = {};
    for (const [key, value] of Object.entries(config)) {
      (vars as Record<string, string>)[`--color-${key}`] =
        `var(--${value.color})`;
    }
    return vars;
  }, [config]);

  const toggleSeries = React.useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resolvedHeight =
    width > 0 ? Math.max(160, width / aspectRatio) : height || 240;

  return (
    <ChartContext.Provider
      value={{
        config,
        width,
        height: resolvedHeight,
        hidden,
        toggleSeries,
      }}
    >
      <figure
        ref={ref}
        role="figure"
        aria-label={ariaLabel}
        data-slot="chart-container"
        className={cn("w-full text-foreground", className)}
        style={{ ...style, minHeight: resolvedHeight }}
      >
        {loading ? (
          <Skeleton className="h-full min-h-40 w-full" />
        ) : empty ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </figure>
    </ChartContext.Provider>
  );
}
