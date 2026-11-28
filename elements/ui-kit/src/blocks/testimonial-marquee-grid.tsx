"use client";

import * as React from "react";

import { Marquee } from "../components/ui/marquee";
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

export type TestimonialMarqueeGridProps = {
  items?: TestimonialBlockItem[];
  className?: string;
  pauseOnHover?: boolean;
};

function QuoteCard({ item }: { item: TestimonialBlockItem }) {
  return (
    <SocialQuoteCard
      className="w-80 shrink-0"
      name={item.name}
      handle={testimonialHandle(item) ?? testimonialSubtitle(item)}
      text={item.quote}
      avatar={testimonialInitials(item.name)}
    />
  );
}

export function TestimonialMarqueeGrid({
  items = defaultTestimonialItems,
  className,
  pauseOnHover = true,
}: TestimonialMarqueeGridProps) {
  const reduce = useReducedMotion();
  const rowA = items;
  const rowB = [...items].reverse();

  return (
    <section
      data-slot="testimonial-marquee-grid"
      className={cn("w-full space-y-4 overflow-hidden", className)}
    >
      {reduce ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <QuoteCard key={item.name} item={item} />
          ))}
        </div>
      ) : (
        <>
          <Marquee pauseOnHover={pauseOnHover} duration={36} repeat={3}>
            {rowA.map((item) => (
              <QuoteCard key={`a-${item.name}`} item={item} />
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover={pauseOnHover} duration={40} repeat={3}>
            {rowB.map((item) => (
              <QuoteCard key={`b-${item.name}`} item={item} />
            ))}
          </Marquee>
        </>
      )}
    </section>
  );
}