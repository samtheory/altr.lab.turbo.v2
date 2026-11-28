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

export type FaqAccordionProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: FaqItem[];
  className?: string;
};

/** Marketing FAQ section wrapping the kit Accordion. */
export function FaqAccordion({
  eyebrow = "FAQ",
  title = "Frequently asked questions",
  description,
  items = defaultFaqItems,
  className,
}: FaqAccordionProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });

  return (
    <section
      ref={ref}
      data-slot="faq-accordion"
      className={cn(
        "mx-auto grid w-full max-w-5xl gap-10 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16",
        className,
      )}
    >
      <motion.div
        className="lg:sticky lg:top-24 lg:self-start"
        initial={reduce ? false : { opacity: 0, x: -16 }}
        animate={reduce || inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
        ) : null}
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card/60 px-2 sm:px-4">
          {items.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-accordion-${i}`}>
              <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}