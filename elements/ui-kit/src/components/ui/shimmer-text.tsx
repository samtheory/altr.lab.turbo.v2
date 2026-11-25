"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ShimmerTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
};

export function ShimmerText({
  children,
  className,
  as: Tag = "span",
}: ShimmerTextProps) {
  const reduce = useReducedMotion();
  return (
    <Tag
      data-slot="shimmer-text"
      className={cn(!reduce && "apolyx-shimmer-text", className)}
    >
      {children}
    </Tag>
  );
}