"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type DesignResultCard = {
  id?: string;
  title: string;
  tag?: string;
  imageColor?: string;
};

export type DesignResultsProps = {
  results?: DesignResultCard[];
  className?: string;
};

const defaultResults: DesignResultCard[] = [
  { title: "Editorial hero", tag: "Landing", imageColor: "color-mix(in oklch, var(--primary) 25%, var(--muted))" },
  { title: "SaaS pricing", tag: "Blocks", imageColor: "color-mix(in oklch, var(--info) 22%, var(--muted))" },
  { title: "Agent timeline", tag: "HITL", imageColor: "color-mix(in oklch, var(--success) 20%, var(--muted))" },
  { title: "Dark dashboard", tag: "App", imageColor: "color-mix(in oklch, var(--warning) 18%, var(--muted))" },
  { title: "Moodboard kit", tag: "Creative", imageColor: "color-mix(in oklch, var(--destructive) 15%, var(--muted))" },
  { title: "Voice orb", tag: "Voice", imageColor: "color-mix(in oklch, var(--primary) 12%, var(--card))" },
];

/** Masonry-style grid of design search result cards. */
export function DesignResults({ results = defaultResults, className }: DesignResultsProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <div
      ref={ref}
      data-slot="design-results"
      className={cn(
        "columns-1 gap-4 sm:columns-2 lg:columns-3",
        className,
      )}
    >
      {results.map((card, i) => {
        const key = card.id ?? card.title;
        const tall = i % 3 === 0;
        return (
          <motion.article
            key={key}
            className={cn(
              "mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
            )}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ delay: (i % 6) * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className={cn("w-full", tall ? "h-44" : "h-28")}
              style={{ background: card.imageColor ?? "var(--muted)" }}
              aria-hidden
            />
            <div className="p-4">
              {card.tag ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.tag}
                </span>
              ) : null}
              <h3 className="mt-1 text-sm font-semibold tracking-tight">{card.title}</h3>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}