"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { Card } from "./card";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type StoryQuoteProps = {
  quote?: string;
  author?: string;
  role?: string;
  avatar?: string;
  className?: string;
};

/** Testimonial card with a soft rise-in and accent bar. */
export function StoryQuote({
  quote = "Apolyx finally made our product UI feel like one system — motion included.",
  author = "Sam Alizadeh",
  role = "Product design",
  avatar,
  className,
}: StoryQuoteProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const show = reduce || inView;

  return (
    <Card
      ref={ref}
      data-slot="story-quote"
      className={cn("relative w-full max-w-md overflow-hidden p-0", className)}
    >
      <motion.div
        className="absolute inset-y-0 left-0 w-1 bg-primary"
        initial={reduce ? false : { scaleY: 0 }}
        animate={{ scaleY: show ? 1 : 0 }}
        style={{ originY: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.blockquote
        className="space-y-5 p-7 pl-8"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-lg font-medium leading-snug tracking-tight text-pretty">
          “{quote}”
        </p>
        <footer className="flex items-center gap-3">
          <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              author
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
            )}
          </span>
          <div>
            <cite className="not-italic text-sm font-semibold">{author}</cite>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
        </footer>
      </motion.blockquote>
    </Card>
  );
}
