"use client";

import * as React from "react";
import { motion } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { SocialQuoteCard } from "../components/ui/social-quote-card";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";
import {
  defaultTestimonialItems,
  testimonialHandle,
  testimonialInitials,
  testimonialSubtitle,
  type TestimonialBlockItem,
} from "./testimonial-items";

export type { TestimonialBlockItem };

export type TestimonialDragBgProps = {
  items?: TestimonialBlockItem[];
  featuredIndex?: number;
  className?: string;
};

export function TestimonialDragBg({
  items = defaultTestimonialItems,
  featuredIndex = 0,
  className,
}: TestimonialDragBgProps) {
  const reduce = useReducedMotion();
  const featured = items[featuredIndex] ?? items[0];
  const bgItems = items.filter((_, i) => i !== featuredIndex);

  if (!featured) return null;

  return (
    <section
      data-slot="testimonial-drag-bg"
      className={cn(
        "relative isolate flex min-h-96 w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-muted/30 py-16",
        className,
      )}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 z-0 grid cursor-grab place-items-center opacity-40 active:cursor-grabbing"
        drag={reduce ? false : true}
        dragConstraints={{ left: -80, right: 80, top: -60, bottom: 60 }}
        dragElastic={0.12}
      >
        <div className="grid grid-cols-2 gap-4 p-8 sm:grid-cols-3">
          {bgItems.map((item, i) => (
            <SocialQuoteCard
              key={item.name}
              className={cn(
                "max-w-xs scale-95 select-none",
                i % 2 === 0 && "translate-y-3",
                i % 3 === 1 && "-translate-x-2",
              )}
              name={item.name}
              handle={testimonialHandle(item)}
              text={item.quote}
              avatar={testimonialInitials(item.name)}
            />
          ))}
        </div>
      </motion.div>

      <div className="pointer-events-none relative z-10 mx-auto max-w-lg rounded-2xl border border-border bg-card/95 p-8 shadow-lg backdrop-blur-sm">
        <blockquote className="text-lg font-medium leading-relaxed">
          &ldquo;{featured.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-3">
          <Avatar className="size-10">
            {featured.avatar ? <AvatarImage src={featured.avatar} alt="" /> : null}
            <AvatarFallback>{testimonialInitials(featured.name)}</AvatarFallback>
          </Avatar>
          <div>
            <cite className="not-italic text-sm font-semibold">{featured.name}</cite>
            {testimonialSubtitle(featured) ? (
              <div className="text-sm text-muted-foreground">{testimonialSubtitle(featured)}</div>
            ) : null}
          </div>
        </figcaption>
        {!reduce ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">Drag the quote field behind this card</p>
        ) : null}
      </div>
    </section>
  );
}