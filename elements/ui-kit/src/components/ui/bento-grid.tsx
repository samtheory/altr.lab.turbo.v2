"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type BentoGridProps = {
  className?: string;
  children: React.ReactNode;
};

export type BentoItemProps = {
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  children: React.ReactNode;
};

export function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(
        "grid auto-rows-[minmax(7.5rem,auto)] grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoItem({
  className,
  colSpan = 1,
  rowSpan = 1,
  children,
}: BentoItemProps) {
  return (
    <div
      data-slot="bento-item"
      className={cn(
        "flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs",
        colSpan === 2 && "sm:col-span-2",
        colSpan === 3 && "sm:col-span-2 lg:col-span-3",
        rowSpan === 2 && "row-span-2 min-h-[16rem] sm:min-h-0",
        className,
      )}
    >
      {children}
    </div>
  );
}