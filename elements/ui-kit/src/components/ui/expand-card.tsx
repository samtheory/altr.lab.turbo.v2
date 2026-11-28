"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { durations, easings } from "../../motion/tokens";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ExpandCardProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
};

export function ExpandCard({
  summary,
  children,
  className,
  defaultExpanded = false,
}: ExpandCardProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(defaultExpanded);
  const id = React.useId();
  const panelId = `${id}-panel`;

  const toggle = () => setOpen((v) => !v);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      data-slot="expand-card"
      data-expanded={open || undefined}
      className={cn("rounded-xl border border-border bg-card", className)}
    >
      <button
        type="button"
        data-slot="expand-card-trigger"
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        {summary}
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      <motion.div
        id={panelId}
        role="region"
        data-slot="expand-card-panel"
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: durations.base, ease: [...easings.inOut] }
        }
        className="overflow-hidden"
      >
        <div className="border-t border-border p-4 pt-3">{children}</div>
      </motion.div>
    </div>
  );
}