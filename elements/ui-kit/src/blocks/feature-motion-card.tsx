"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

import { cn } from "../lib/utils";
import { durations, easings } from "../motion/tokens";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type FeatureMotionCardProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  visual?: React.ReactNode;
  href?: string;
  className?: string;
};

const defaultVisual = (
  <div className="grid size-14 place-items-center rounded-xl border border-border bg-primary/10 text-primary">
    <Sparkles className="size-6" aria-hidden />
  </div>
);

/** Single marketing feature card with hover lift and soft glow. */
export function FeatureMotionCard({
  title = "Composable by default",
  description = "Stack primitives into sections without Radix forks — semantic tokens and motion hooks ship with every block.",
  visual = defaultVisual,
  href,
  className,
}: FeatureMotionCardProps) {
  const reduce = useReducedMotion();

  const body = (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <motion.div
          className="shrink-0"
          whileHover={reduce ? undefined : { scale: 1.05, rotate: -2 }}
          transition={{ duration: durations.base, ease: [...easings.out] }}
        >
          {visual}
        </motion.div>
        <div
          className="h-px flex-1 self-center bg-linear-to-r from-border via-border/40 to-transparent"
          aria-hidden
        />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </>
  );

  const cardClass = cn(
    "group relative block overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm",
    "transition-[box-shadow,border-color] duration-200",
    "hover:border-primary/25 hover:shadow-md",
    className,
  );

  const liftHover = reduce ? undefined : { y: -6 };
  const liftTransition = reduce
    ? undefined
    : { duration: durations.slow, ease: [...easings.out] as const };

  if (href) {
    return (
      <motion.a
        href={href}
        data-slot="feature-motion-card"
        className={cardClass}
        whileHover={liftHover}
        transition={liftTransition}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        {body}
      </motion.a>
    );
  }

  return (
    <motion.div
      data-slot="feature-motion-card"
      className={cardClass}
      whileHover={liftHover}
      transition={liftTransition}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      {body}
    </motion.div>
  );
}