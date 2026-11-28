"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ExpandGridItem = {
  id: string;
  title: string;
  description?: string;
  content?: React.ReactNode;
};

export type ExpandGridProps = {
  items: ExpandGridItem[];
  className?: string;
};

export function ExpandGrid({ items, className }: ExpandGridProps) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <div
      data-slot="expand-grid"
      className={cn(
        "grid auto-rows-[minmax(7rem,auto)] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = expanded === item.id;
        return (
          <motion.button
            key={item.id}
            type="button"
            layout={!reduce}
            onClick={() => setExpanded(isOpen ? null : item.id)}
            aria-expanded={isOpen}
            className={cn(
              "relative flex flex-col items-start rounded-xl border border-border bg-card p-4 text-left shadow-xs transition-colors hover:border-primary/30 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isOpen && "sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[14rem]",
            )}
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {item.id}
            </span>
            <span className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              {item.title}
            </span>
            {item.description ? (
              <span className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </span>
            ) : null}
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="body"
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduce ? undefined : { opacity: 0, height: 0 }}
                  className="mt-4 w-full border-t border-border pt-4"
                >
                  {item.content ?? (
                    <p className="text-sm text-pretty text-muted-foreground">
                      Expanded tile — add custom content via the <code className="text-foreground">content</code>{" "}
                      prop.
                    </p>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}