"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { durations, easings } from "../../motion/tokens";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type RevealListProps = {
  className?: string;
  as?: "ul" | "div";
  children?: React.ReactNode;
  stagger?: number;
};

export function RevealList({
  className,
  as = "ul",
  children,
  stagger = 0.06,
}: RevealListProps) {
  const reduce = useReducedMotion();
  const Item = as === "ul" ? motion.li : motion.div;
  const Wrapper = as === "ul" ? "ul" : "div";

  return (
    <Wrapper data-slot="reveal-list" className={cn(as === "ul" && "list-none", className)}>
      <AnimatePresence initial={false}>
        {React.Children.map(children, (child, index) =>
          child ? (
            <Item
              key={(child as React.ReactElement).key ?? index}
              layout
              className={as === "ul" ? "list-none" : undefined}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 }}
              transition={{
                duration: reduce ? 0 : durations.base,
                ease: [...easings.out],
                delay: reduce ? 0 : index * stagger,
              }}
            >
              {child}
            </Item>
          ) : null,
        )}
      </AnimatePresence>
    </Wrapper>
  );
}