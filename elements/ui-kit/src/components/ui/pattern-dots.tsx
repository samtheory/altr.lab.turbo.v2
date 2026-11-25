"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { PatternFrame } from "./pattern-frame";

export type PatternDotsProps = {
  width?: number;
  height?: number;
  radius?: number;
  opacity?: number;
  vignette?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function PatternDots({
  width = 18,
  height = 18,
  radius = 1,
  opacity = 1,
  vignette = false,
  className,
  children,
}: PatternDotsProps) {
  const id = React.useId();
  return (
    <PatternFrame
      data-slot="pattern-dots"
      className={cn("min-h-40", className)}
      patternClassName={cn(
        vignette &&
          "[mask-image:radial-gradient(ellipse_85%_75%_at_50%_45%,#000_35%,transparent_88%)]",
      )}
      pattern={
        <svg className="h-full w-full" style={{ opacity }}>
          <defs>
            <pattern
              id={id}
              width={width}
              height={height}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={width / 2}
                cy={height / 2}
                r={radius}
                className="fill-border"
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