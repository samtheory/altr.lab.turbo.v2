"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type QuoteBlockProps = {
  quote?: string;
  author?: string;
  role?: string;
  company?: string;
  className?: string;
};

/** Large testimonial quote for marketing sections. */
export function QuoteBlock({
  quote = "We shipped a cohesive product UI in weeks — motion, charts, and agent chrome included.",
  author = "Morgan Hayes",
  role = "VP Product",
  company = "Northline",
  className,
}: QuoteBlockProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const show = reduce || inView;

  return (
    <figure
      ref={ref}
      data-slot="quote-block"
      className={cn(
        "relative mx-auto max-w-3xl rounded-3xl border border-border/80 bg-gradient-to-br from-card to-muted/30 px-8 py-12 text-center shadow-sm sm:px-14",
        className,
      )}
    >
      <span className="pointer-events-none font-display text-6xl leading-none text-primary/20" aria-hidden>
        “
      </span>
      <motion.blockquote
        className="relative -mt-8"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-xl font-medium leading-relaxed tracking-tight text-pretty sm:text-2xl">
          {quote}
        </p>
      </motion.blockquote>
      <motion.figcaption
        className="mt-8 text-sm"
        initial={reduce ? false : { opacity: 0 }}
        animate={show ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.12, duration: 0.45 }}
      >
        <cite className="not-italic font-semibold">{author}</cite>
        <span className="text-muted-foreground">
          {" "}
          · {role}
          {company ? `, ${company}` : ""}
        </span>
      </motion.figcaption>
    </figure>
  );
}