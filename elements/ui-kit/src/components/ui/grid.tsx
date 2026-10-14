import * as React from "react";

import { cn } from "../../lib/utils";
import { Slot } from "../../primitives/slot";

type Cols = 1 | 2 | 3 | 4 | 5 | 6;
type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

/** Literal class strings so Tailwind can see every combination. */
const colClasses: Record<Breakpoint, Record<Cols, string>> = {
  base: { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" },
  sm: { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6" },
  md: { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6" },
  lg: { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" },
  xl: { 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5", 6: "xl:grid-cols-6" },
};

const gapClasses = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
} as const;

export type GridCols = Cols | Partial<Record<Breakpoint, Cols>>;

export type GridProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Column count, or a responsive map like `{ base: 1, md: 2, lg: 3 }`. */
  cols?: GridCols;
  gap?: keyof typeof gapClasses;
  /** Auto-fill columns with this minimum width instead of a fixed count (e.g. `"14rem"`). */
  minItemWidth?: string;
  asChild?: boolean;
  ref?: React.Ref<HTMLDivElement>;
};

export function Grid({
  cols = { base: 1, sm: 2, lg: 3 },
  gap = "md",
  minItemWidth,
  asChild,
  className,
  style,
  ref,
  ...props
}: GridProps) {
  const Comp = (asChild ? Slot : "div") as React.ElementType;
  const map = typeof cols === "number" ? { base: cols } : cols;
  const colClassName = minItemWidth
    ? undefined
    : (Object.entries(map) as [Breakpoint, Cols][]).map(([bp, n]) => colClasses[bp][n]);
  return (
    <Comp
      ref={ref}
      data-slot="grid"
      className={cn("grid", gapClasses[gap], colClassName, className)}
      style={
        minItemWidth
          ? {
              gridTemplateColumns: `repeat(auto-fill, minmax(min(${minItemWidth}, 100%), 1fr))`,
              ...style,
            }
          : style
      }
      {...props}
    />
  );
}
