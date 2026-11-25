"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { PatternFrame } from "./pattern-frame";

export type PatternHexProps = {
  size?: number;
  strokeWidth?: number;
  /** Pattern tile opacity 0–1 */
  opacity?: number;
  /** Fade pattern at edges for hero backgrounds */
  vignette?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const hexPath = (w: number, h: number) => {
  const x = w / 2;
  return `M${x},0 L${w},${h * 0.25} L${w},${h * 0.75} L${x},${h} L0,${h * 0.75} L0,${h * 0.25} Z`;
};

export function PatternHex({
  size = 26,
  strokeWidth = 1,
  opacity = 1,
  vignette = false,
  className,
  children,
}: PatternHexProps) {
  const id = React.useId();
  const h = size * 0.866;
  return (
    <PatternFrame
      data-slot="pattern-hex"
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
              width={size}
              height={h}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={hexPath(size, h)}
                fill="none"
                className="stroke-border/80"
                strokeWidth={strokeWidth}
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