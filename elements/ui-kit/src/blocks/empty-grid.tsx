"use client";

import * as React from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { motion, useInView } from "motion/react";

import { EmptyState } from "../components/ui/empty-state";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type EmptyGridProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode | null;
  onAction?: () => void;
  columns?: number;
  rows?: number;
  className?: string;
};

function GridIllustration({ columns = 2, rows = 3 }: { columns?: number; rows?: number }) {
  const cells = Array.from({ length: columns * rows }, (_, i) => i);
  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-xs rounded-xl border border-dashed border-border bg-muted/20 p-3"
    >
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <div
            key={cell}
            className={cn(
              "flex aspect-[4/3] items-center justify-center rounded-md border border-border/60 bg-card/80",
              cell === Math.floor(cells.length / 2) && "border-primary/30 bg-primary/5",
            )}
          >
            {cell === Math.floor(cells.length / 2) ? (
              <LayoutGrid className="size-4 text-primary/50" />
            ) : (
              <span className="size-2 rounded-sm bg-muted" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Empty state with a vertical / grid slot layout. */
export function EmptyGrid({
  title = "Nothing in this view",
  description = "Add items to populate the grid, or adjust filters to see existing content.",
  actionLabel = "Add item",
  onAction,
  columns = 2,
  rows = 3,
  className,
}: EmptyGridProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      data-slot="empty-grid"
      className={cn("flex w-full justify-center", className)}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <EmptyState
        title={title}
        description={description}
        actionLabel={actionLabel}
        actionIcon={Plus}
        onAction={onAction}
        secondaryActionLabel={null}
        illustration={<GridIllustration columns={columns} rows={rows} />}
        className="max-w-lg"
      />
    </motion.div>
  );
}