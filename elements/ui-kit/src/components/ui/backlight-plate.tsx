"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";

export type BacklightPlateProps = { children?: React.ReactNode; className?: string };

export function BacklightPlate({ children, className }: BacklightPlateProps) {
  return (
    <div data-slot="backlight-plate" className={cn("relative rounded-xl border border-border bg-card", className)}>
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/15 blur-2xl"
        aria-hidden
      />
      {children}
    </div>
  );
}