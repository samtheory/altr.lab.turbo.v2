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

export type TestimonialCarouselProps = {
  items?: TestimonialBlockItem[];
  className?: string;
};

export function TestimonialCarousel({
  items = defaultTestimonialItems,
  className,
}: TestimonialCarouselProps) {
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
      data-slot="testimonial-carousel"
      className={cn(
        "w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">What teams say</p>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => go(-1)} aria-label="Previous testimonial">
            Prev
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => go(1)} aria-label="Next testimonial">
            Next
          </Button>
        </div>
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-labelledby={quoteId}
        onKeyDown={onKeyDown}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <motion.div
            key={`media-${index}`}
            className="mx-auto size-28 shrink-0 overflow-hidden rounded-xl border border-border sm:mx-0 sm:size-32"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.28 }}
          >
            {item.image ? (
              <img src={item.image} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full" style={{ background: tint }} aria-hidden />
            )}
          </motion.div>

          <div className="relative min-h-28 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={index}
                id={quoteId}
                initial={reduce ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -20 }}
                transition={{ duration: reduce ? 0 : 0.28 }}
              >
                <blockquote className="text-base leading-relaxed sm:text-lg">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <Avatar className="size-9">
                    {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
                    <AvatarFallback>{testimonialInitials(item.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <cite className="not-italic text-sm font-medium">{item.name}</cite>
                    {testimonialSubtitle(item) ? (
                      <div className="text-xs text-muted-foreground">{testimonialSubtitle(item)}</div>
                    ) : null}
                  </div>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
        {items.map((_, i) => (
          <span
            key={i}
            className={cn("size-1.5 rounded-full bg-muted", i === index && "bg-primary")}
          />
        ))}
      </div>
    </section>
  );
}