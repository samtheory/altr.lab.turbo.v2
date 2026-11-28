"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";
import { defaultFaqItems, type FaqItem } from "./faq-items";

export type { FaqItem };

export type FaqDashedProps = {
  title?: string;
  description?: string;
  items?: FaqItem[];
  className?: string;
};

/** FAQ list with dashed dividers; keyboard-expandable triggers. */
export function FaqDashed({
  title = "Questions & answers",
  description = "Everything you need to know before you ship.",
  items = defaultFaqItems,
  className,
}: FaqDashedProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      data-slot="faq-dashed"
      className={cn("mx-auto w-full max-w-2xl px-4", className)}
    >
      <motion.header
        className="mb-8 text-center"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </motion.header>

      <Accordion type="single" collapsible className="rounded-2xl border border-dashed border-border bg-card/40 px-4 sm:px-6">
        {items.map((item, i) => (
          <AccordionItem
            key={item.q}
            value={`faq-${i}`}
            className="border-b border-dashed border-border last:border-b-0"
          >
            <AccordionTrigger className="text-base font-medium">{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}