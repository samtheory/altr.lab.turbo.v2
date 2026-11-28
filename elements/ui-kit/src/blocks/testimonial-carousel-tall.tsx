"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";
import {
  defaultTestimonialItems,
  testimonialImageTints,
  testimonialInitials,
  testimonialSubtitle,
  type TestimonialBlockItem,
} from "./testimonial-items";

export type { TestimonialBlockItem };

export type TestimonialCarouselTallProps = {
  items?: TestimonialBlockItem[];
  className?: string;
};

export function TestimonialCarouselTall({
  items = defaultTestimonialItems,
  className,
}: TestimonialCarouselTallProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const item = items[index];
  const quoteId = React.useId();

  const go = React.useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      setIndex((i) => (i + delta + items.length) % items.length);
    },
    [items.length],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  if (!item) return null;

  const tint = testimonialImageTints[index % testimonialImageTints.length];

  return (
    <section
      data-slot="testimonial-carousel-tall"
      className={cn(
        "grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:grid-cols-[1.05fr_1fr]",
        className,
      )}
    >
      <motion.div
        key={`photo-${index}`}
        className="relative min-h-64 md:min-h-[28rem]"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {item.image ? (
          <img src={item.image} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full" style={{ background: tint }} aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent md:from-transparent md:via-transparent md:to-transparent" />
      </motion.div>

      <div
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-labelledby={quoteId}
        onKeyDown={onKeyDown}
        className="flex flex-col justify-between gap-6 p-8 outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-10"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Testimonials
          </p>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => go(-1)} aria-label="Previous testimonial">
              Prev
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => go(1)} aria-label="Next testimonial">
              Next
            </Button>
          </div>
        </div>

        <div className="relative min-h-40">
          <AnimatePresence mode="wait" initial={false}>
            <motion.figure
              key={index}
              id={quoteId}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: reduce ? 0 : 0.32 }}
            >
              <blockquote className="text-xl font-medium leading-relaxed tracking-tight text-pretty sm:text-2xl">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Avatar className="size-11">
                  {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
                  <AvatarFallback>{testimonialInitials(item.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <motion.cite className="not-italic text-sm font-semibold">{item.name}</motion.cite>
                  {testimonialSubtitle(item) ? (
                    <div className="mt-0.5 text-sm text-muted-foreground">{testimonialSubtitle(item)}</div>
                  ) : null}
                </div>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}