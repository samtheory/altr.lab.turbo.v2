"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";

export type TestimonialItem = {
  quote: string;
  name: string;
  role?: string;
  avatar?: string;
};

export type TestimonialReelProps = {
  items: TestimonialItem[];
  className?: string;
  autoAdvance?: boolean;
  interval?: number;
};

export function TestimonialReel({
  items,
  className,
  autoAdvance = true,
  interval = 6000,
}: TestimonialReelProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const item = items[index];
  const labelId = React.useId();

  const go = React.useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      setIndex((i) => (i + delta + items.length) % items.length);
    },
    [items.length],
  );

  React.useEffect(() => {
    if (reduce || !autoAdvance || items.length < 2) return;
    const id = window.setInterval(() => go(1), interval);
    return () => window.clearInterval(id);
  }, [autoAdvance, go, interval, items.length, reduce]);

  if (!item) return null;

  return (
    <section
      data-slot="testimonial-reel"
      className={cn("w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm", className)}
      aria-labelledby={labelId}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 id={labelId} className="text-sm font-medium text-muted-foreground">
          Testimonials
        </h3>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => go(-1)}
            aria-label="Previous testimonial"
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => go(1)}
            aria-label="Next testimonial"
          >
            Next
          </Button>
        </div>
      </div>
      <div className="relative min-h-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={index}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.28 }}
          >
            <blockquote className="text-base leading-relaxed text-foreground">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <Avatar className="size-9">
                {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
                <AvatarFallback>{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium leading-none">{item.name}</div>
                {item.role ? (
                  <div className="mt-1 text-xs text-muted-foreground">{item.role}</div>
                ) : null}
              </div>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        {items.map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full bg-muted",
              i === index && "bg-primary",
            )}
          />
        ))}
      </div>
    </section>
  );
}