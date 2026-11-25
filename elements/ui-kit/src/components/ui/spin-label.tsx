"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SpinLabelProps = { text: string; className?: string; duration?: number };

export function SpinLabel({ text, className, duration = 12 }: SpinLabelProps) {
  const reduce = useReducedMotion();
  const id = React.useId();
  const pathId = "spin-" + id.replace(/:/g, "");
  const loop = (text.trim() + " • ").repeat(4);

  return (
    <svg data-slot="spin-label" viewBox="0 0 100 100" className={cn(className)} aria-hidden>
      <defs>
        <path id={pathId} d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
      </defs>
      <text className="fill-current">
        <textPath
          href={"#" + pathId}
          className={cn(!reduce && "apolyx-spin-label")}
          style={{ ["--spin-dur" as string]: duration + "s" }}
        >
          {loop}
        </textPath>
      </text>
    </svg>
  );
}