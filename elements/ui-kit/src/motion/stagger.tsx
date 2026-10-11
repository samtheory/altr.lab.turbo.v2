"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../lib/utils";
import { durations, easings } from "./tokens";
import { useReducedMotion } from "./use-reduced-motion";

export type StaggerProps = {
  as?: "div" | "ul";
  className?: string;
  children?: React.ReactNode;
  staggerChildren?: number;
};

export function Stagger({
  as = "div",
  className,
  children,
  staggerChildren = 0.06,
}: StaggerProps) {
  const reduced = useReducedMotion();
  const Comp = as === "ul" ? motion.ul : motion.div;
  return (
    <Comp
      className={cn(className)}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduced ? 0 : staggerChildren,
          },
        },
      }}
    >
      {children}
    </Comp>
  );
}

export type StaggerItemProps = {
  as?: "div" | "li";
  className?: string;
  children?: React.ReactNode;
};

export function StaggerItem({
  as = "div",
  className,
  children,
}: StaggerItemProps) {
  const reduced = useReducedMotion();
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp
      className={cn(className)}
      variants={{
        hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: durations.base, ease: [...easings.out] },
        },
      }}
    >
      {children}
    </Comp>
  );
}
