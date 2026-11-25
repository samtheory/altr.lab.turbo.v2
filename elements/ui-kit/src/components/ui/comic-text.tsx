"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";

export type ComicTextProps = { children: React.ReactNode; className?: string };

export function ComicText({ children, className }: ComicTextProps) {
  return (
    <span data-slot="comic-text" className={cn("apolyx-comic-text font-black uppercase", className)}>
      {children}
    </span>
  );
}