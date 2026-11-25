"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type GradientFlowTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "h2";
};

export function GradientFlowText({ children, className, as: Tag = "span" }: GradientFlowTextProps) {
  const reduce = useReducedMotion();
  return (
    <Tag data-slot="gradient-flow-text" className={cn(!reduce && "apolyx-gradient-flow-text", className)}>
      {children}
    </Tag>
  );
}