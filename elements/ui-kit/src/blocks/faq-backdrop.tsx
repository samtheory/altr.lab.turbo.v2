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

export type FaqBackdropProps = {
  title?: string;
  description?: string;
  items?: FaqItem[];
  className?: string;
};

/** FAQ panel over a decorative mesh / muted pattern backdrop. */
export function FaqBackdrop({
  title = "Support",
  description = "Quick answers on billing, theming, and shipping with Apolyx.",
  items = defaultFaqItems,
  className,
}: FaqBackdropProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      data-slot="faq-backdrop"
      className={cn("relative isolate mx-auto w-full max-w-3xl px-4 py-6", className)}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-muted/40" />
        <div
          className={cn(
            "absolute -top-1/3 left-1/4 size-[70%] rounded-full bg-primary/20 blur-3xl",
            !reduce && "apolyx-mesh-blob",
          )}
        />
        <div
          className={cn(
            "absolute top-1/3 -right-1/4 size-[60%] rounded-full bg-primary/10 blur-3xl",
            !reduce && "apolyx-mesh-blob apolyx-mesh-blob-b",
          )}
        />
        <div
          className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px]"
        />
      </div>

      <motion.div
        className="relative rounded-3xl border border-border/80 bg-background/85 p-6 shadow-sm backdrop-blur-sm sm:p-10"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="mb-6 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>

        <Accordion type="single" collapsible>
          {items.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-backdrop-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}