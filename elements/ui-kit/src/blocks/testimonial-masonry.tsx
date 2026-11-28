"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

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

export type TestimonialMasonryProps = {
  items?: TestimonialBlockItem[];
  className?: string;
};

const extraQuotes: TestimonialBlockItem[] = [
  {
    quote: "Shipped three landing variants in a single afternoon.",
    name: "Casey Ng",
    role: "Growth",
    company: "Spline",
  },
  {
    quote: "Storybook + docs stayed in sync with every block we pulled in.",
    name: "Dana Ortiz",
    role: "Design ops",
    company: "Foundry",
  },
];

export function TestimonialMasonry({
  items = [...defaultTestimonialItems, ...extraQuotes],
  className,
}: TestimonialMasonryProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });

  return (
    <section
      ref={ref}
      data-slot="testimonial-masonry"
      className={cn("columns-1 gap-4 sm:columns-2 lg:columns-3", className)}
    >
      {items.map((item, i) => (
        <motion.div
          key={`${item.name}-${i}`}
          className="mb-4 break-inside-avoid"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{
            delay: (i % 6) * 0.07,
            duration: 0.42,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <SocialQuoteCard
            className="max-w-none"
            name={item.name}
            handle={testimonialHandle(item) ?? testimonialSubtitle(item)}
            text={item.quote}
            avatar={testimonialInitials(item.name)}
          />
        </motion.div>
      ))}
    </section>
  );
}