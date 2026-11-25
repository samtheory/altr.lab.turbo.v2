"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";

export type LineShadowTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "h1" | "h2";
};

export function LineShadowText({ children, className, as: Tag = "span" }: LineShadowTextProps) {
  return (
    <Tag data-slot="line-shadow-text" className={cn("apolyx-line-shadow-text", className)}>
      {children}
    </Tag>
  );
}