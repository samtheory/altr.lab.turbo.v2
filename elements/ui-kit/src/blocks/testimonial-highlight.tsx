"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";
import {
  defaultTestimonialItems,
  testimonialInitials,
  testimonialSubtitle,
  type TestimonialBlockItem,
} from "./testimonial-items";

export type { TestimonialBlockItem };

export type TestimonialHighlightProps = {
  items?: TestimonialBlockItem[];
  className?: string;
};

export function TestimonialHighlight({
  items = defaultTestimonialItems,
  className,
}: TestimonialHighlightProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const item = items[index];
  const quoteId = React.useId();

  if (!item) return null;

  return (
    <section
      data-slot="testimonial-highlight"
      className={cn("mx-auto w-full max-w-3xl px-4 text-center", className)}
    >
      <span className="font-display text-5xl leading-none text-primary/25" aria-hidden>
        &ldquo;
      </span>

      <div className="relative -mt-6 min-h-36">
        <AnimatePresence mode="wait" initial={false}>
          <motion.blockquote
            key={index}
            id={quoteId}
            className={cn(
              "text-xl font-medium leading-relaxed tracking-tight text-pretty sm:text-2xl",
              "text-foreground",
            )}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0 : 0.32 }}
          >
            {item.quote}
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <motion.figcaption
        key={`meta-${index}`}
        className="mt-6 space-y-1"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <cite className="not-italic text-sm font-semibold">{item.name}</cite>
        {testimonialSubtitle(item) ? (
          <div className="text-sm text-muted-foreground">{testimonialSubtitle(item)}</div>
        ) : null}
      </motion.figcaption>

      <div
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
        role="tablist"
        aria-label="Choose testimonial"
      >
        {items.map((entry, i) => {
          const active = i === index;
          return (
            <button
              key={entry.name}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={quoteId}
              onClick={() => setIndex(i)}
              className={cn(
                "rounded-full ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100",
              )}
            >
              <Avatar className="size-12">
                {entry.avatar ? <AvatarImage src={entry.avatar} alt="" /> : null}
                <AvatarFallback>{testimonialInitials(entry.name)}</AvatarFallback>
              </Avatar>
              <span className="sr-only">{entry.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}