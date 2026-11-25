"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { PatternFrame } from "./pattern-frame";

export type PatternStripesProps = {
  angle?: number;
  stripe?: number;
  gap?: number;
  className?: string;
  children?: React.ReactNode;
};

export function PatternStripes({
  angle = -35,
  stripe = 1,
  gap = 8,
  className,
  children,
}: PatternStripesProps) {
  const id = React.useId();
  const period = stripe + gap;
  return (
    <PatternFrame
      data-slot="pattern-stripes"
      className={className}
      pattern={
        <svg className="h-full w-full">
          <defs>
            <pattern
              id={id}
              width={period}
              height={period}
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${angle})`}
            >
              <rect
                width={stripe}
                height={period}
                className="fill-foreground/8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
      }
    >
      {children}
    </PatternFrame>
  );
}