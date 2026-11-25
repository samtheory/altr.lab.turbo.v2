"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TextMotionPreset = "rise" | "fade" | "blur";
export type TextMotionProps = {
  children: React.ReactNode;
  preset?: TextMotionPreset;
  className?: string;
};

export function TextMotion({ children, preset = "rise", className }: TextMotionProps) {
  const reduce = useReducedMotion();
  const hidden =
    preset === "blur"
      ? { opacity: 0, filter: "blur(6px)" }
      : preset === "fade"
        ? { opacity: 0 }
        : { opacity: 0, y: 10 };
  const show = { opacity: 1, y: 0, filter: "blur(0px)" };

  return (
    <motion.span
      data-slot="text-motion"
      className={cn(className)}
      initial={reduce ? false : hidden}
      whileInView={show}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: reduce ? 0 : 0.45 }}
    >
      {children}
    </motion.span>
  );
}