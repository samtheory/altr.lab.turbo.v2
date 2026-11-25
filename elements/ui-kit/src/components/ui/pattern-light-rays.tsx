"use client";

import * as React from "react";

import { PatternFrame } from "./pattern-frame";

export type PatternLightRaysProps = {
  rays?: number;
  className?: string;
  children?: React.ReactNode;
};

export function PatternLightRays({
  rays = 12,
  className,
  children,
}: PatternLightRaysProps) {
  const id = React.useId();
  const step = 360 / rays;
  return (
    <PatternFrame
      data-slot="pattern-light-rays"
      className={className}
      pattern={
        <svg className="h-full w-full">
          <defs>
            <radialGradient id={`${id}-fade`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id}-fade)`} />
          <g className="origin-center apolyx-pattern-rays-spin" style={{ transformBox: "fill-box" }}>
            {Array.from({ length: rays }, (_, i) => (
              <line
                key={i}
                x1="50%"
                y1="50%"
                x2="50%"
                y2="0%"
                stroke="var(--primary)"
                strokeOpacity={0.12}
                strokeWidth={1}
                transform={`rotate(${i * step} 50 50)`}
              />
            ))}
          </g>
        </svg>
      }
    >
      {children}
    </PatternFrame>
  );
}