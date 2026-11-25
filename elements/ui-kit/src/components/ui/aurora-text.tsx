"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type AuroraTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
};

export function AuroraText({
  children,
  className,
  as: Tag = "span",
}: AuroraTextProps) {
  const reduce = useReducedMotion();
  return (
    <Tag
      data-slot="aurora-text"
      className={cn(!reduce && "apolyx-aurora-text", className)}
    >
      {children}
    </Tag>
  );
}