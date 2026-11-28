"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type GenerateTextProps = {
  text: string;
  className?: string;
};

export function GenerateText({ text, className }: GenerateTextProps) {
  const reduce = useReducedMotion();
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  if (reduce) {
    return (
      <span data-slot="generate-text" className={cn(className)}>
        {text}
      </span>
    );
  }

  return (
    <span data-slot="generate-text" className={cn("inline", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline">
        {words.map((word, i) => (
          <React.Fragment key={`${word}-${i}`}>
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, filter: "blur(8px)", y: 4 }}
              whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? "\u00a0" : null}
          </React.Fragment>
        ))}
      </span>
    </span>
  );
}