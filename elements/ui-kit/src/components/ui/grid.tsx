import * as React from "react";

import { cn } from "../../lib/utils";
import { Slot } from "../../primitives/slot";

type Cols = 1 | 2 | 3 | 4 | 5 | 6;
type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

/**
 * Literal class strings so Tailwind can see every combination.
 *
 * Uses `@min-[…rem]:` container queries (not `@sm:` / `@lg:`) so the
 * named breakpoints match the same widths as viewport `sm`/`md`/`lg`/`xl`
 * (40/48/64/80rem). Tailwind’s `@sm` container token is only 24rem, which
 * would collapse tablet/desktop maps. Container queries still track the
 * Grid shell — including docs playground Mobile/Tablet frames.
 */
const colClasses: Record<Breakpoint, Record<Cols, string>> = {
  base: { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" },
  sm: {
    1: "@min-[40rem]:grid-cols-1",
    2: "@min-[40rem]:grid-cols-2",
    3: "@min-[40rem]:grid-cols-3",
    4: "@min-[40rem]:grid-cols-4",
    5: "@min-[40rem]:grid-cols-5",
    6: "@min-[40rem]:grid-cols-6",
  },
  md: {
    1: "@min-[48rem]:grid-cols-1",
    2: "@min-[48rem]:grid-cols-2",
    3: "@min-[48rem]:grid-cols-3",
    4: "@min-[48rem]:grid-cols-4",
    5: "@min-[48rem]:grid-cols-5",
    6: "@min-[48rem]:grid-cols-6",
  },
  lg: {
    1: "@min-[64rem]:grid-cols-1",
    2: "@min-[64rem]:grid-cols-2",
    3: "@min-[64rem]:grid-cols-3",
    4: "@min-[64rem]:grid-cols-4",
    5: "@min-[64rem]:grid-cols-5",
    6: "@min-[64rem]:grid-cols-6",
  },
  xl: {
    1: "@min-[80rem]:grid-cols-1",
    2: "@min-[80rem]:grid-cols-2",
    3: "@min-[80rem]:grid-cols-3",
    4: "@min-[80rem]:grid-cols-4",
    5: "@min-[80rem]:grid-cols-5",
    6: "@min-[80rem]:grid-cols-6",
  },
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
  /** Column count, or a responsive map like `{ base: 1, md: 2, lg: 3 }` (container width). */
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
    <div className="@container w-full min-w-0" data-slot="grid-container">
      <Comp
        ref={ref}
        data-slot="grid"
        className={cn("grid w-full", gapClasses[gap], colClassName, className)}
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
    </div>
  );
}
