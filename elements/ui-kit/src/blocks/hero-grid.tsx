"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView } from "motion/react";

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { easings } from "../motion/tokens";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type HeroGridSlot = {
  col: number;
  row: number;
  label?: string;
  icon: React.ReactNode;
};

export type HeroGridAction = {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

const GRID_SIZE = 9;

function GridAction({ action, variant }: { action: HeroGridAction; variant: "default" | "outline" }) {
  if (action.href) {
    return (
      <Button variant={variant} asChild>
        <a href={action.href}>{action.label}</a>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export type HeroGridProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  slots?: HeroGridSlot[];
  interval?: number;
  visibleCount?: number;
  columns?: number;
  rows?: number;
  primaryAction?: HeroGridAction;
  secondaryAction?: HeroGridAction;
  className?: string;
};

/** Centered hero on a square grid with integration icons that blink in and out of fixed cells. */
export function HeroGrid({
  title = "Connect your entire stack",
  description = "Drop branded integration tiles into a living grid — swap vendors without rewriting the hero.",
  slots = [],
  interval = 2200,
  visibleCount = 5,
  columns = GRID_SIZE,
  rows = GRID_SIZE,
  primaryAction = { label: "Explore integrations" },
  secondaryAction,
  className,
}: HeroGridProps) {
  const reduce = useReducedMotion();
  const rootRef = React.useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { amount: 0.25, margin: "0px 0px -10% 0px" });
  const [visible, setVisible] = React.useState<Set<number>>(() => new Set());

  const pickNext = React.useCallback(
    (prev: Set<number>) => {
      if (slots.length === 0) return prev;
      const cap = Math.min(visibleCount, slots.length);
      const next = new Set(prev);
      const candidates = slots.map((_, i) => i).filter((i) => !next.has(i));
      if (next.size < cap && candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
        next.add(pick);
        return next;
      }
      if (next.size >= cap && next.size > 0) {
        const arr = [...next];
        const remove = arr[Math.floor(Math.random() * arr.length)]!;
        next.delete(remove);
        if (candidates.length > 0) {
          const add = candidates[Math.floor(Math.random() * candidates.length)]!;
          next.add(add);
        }
        return next;
      }
      return next;
    },
    [slots, visibleCount],
  );

  React.useEffect(() => {
    if (reduce || !inView || slots.length === 0) {
      setVisible(new Set(slots.slice(0, Math.min(visibleCount, slots.length)).map((_, i) => i)));
      return;
    }
    setVisible(pickNext(new Set()));
    const id = window.setInterval(() => setVisible((v) => pickNext(v)), interval);
    return () => window.clearInterval(id);
  }, [reduce, inView, interval, pickNext, slots, visibleCount]);

  return (
    <section
      ref={rootRef}
      data-slot="hero-grid"
      className={cn("relative mx-auto max-w-5xl px-6 py-16", className)}
    >
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:gap-14">
        <div className="text-center lg:text-left">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            {primaryAction ? <GridAction action={primaryAction} variant="default" /> : null}
            {secondaryAction ? <GridAction action={secondaryAction} variant="outline" /> : null}
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[340px]">
          <div
            className="absolute inset-0 grid gap-px rounded-2xl border border-border bg-border p-px shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
            aria-hidden
          >
            {Array.from({ length: columns * rows }, (_, i) => (
              <div key={i} className="bg-card/80" />
            ))}
          </div>

          <div
            className="pointer-events-none absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            <AnimatePresence initial={false}>
              {[...visible].map((slotIndex) => {
                const slot = slots[slotIndex];
                if (!slot) return null;
                return (
                  <motion.div
                    key={slotIndex}
                    className="flex items-center justify-center p-1"
                    style={{ gridColumn: slot.col, gridRow: slot.row }}
                    initial={reduce ? false : { opacity: 0, scale: 0.72 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.85 }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: easings.out }}
                  >
                    <div
                      className="flex size-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-background/95 p-2 text-center shadow-sm backdrop-blur-sm"
                      title={slot.label}
                    >
                      <span className="flex size-8 items-center justify-center text-foreground [&_svg]:size-5">
                        {slot.icon}
                      </span>
                      {slot.label ? (
                        <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
                          {slot.label}
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_88%)]" />
        </div>
      </div>
    </section>
  );
}