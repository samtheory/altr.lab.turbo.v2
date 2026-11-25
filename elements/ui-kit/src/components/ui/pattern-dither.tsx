"use client";

import * as React from "react";

import { PatternFrame } from "./pattern-frame";

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export type PatternDitherProps = {
  cell?: number;
  className?: string;
  children?: React.ReactNode;
};

export function PatternDither({
  cell = 3,
  className,
  children,
}: PatternDitherProps) {
  const id = React.useId();
  const size = cell * 4;
  return (
    <PatternFrame
      data-slot="pattern-dither"
      className={className}
      pattern={
        <svg className="h-full w-full">
          <defs>
            <pattern
              id={id}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              {BAYER_4.flatMap((row, y) =>
                row.map((v, x) => (
                  <rect
                    key={`${x}-${y}`}
                    x={x * cell}
                    y={y * cell}
                    width={cell}
                    height={cell}
                    className="fill-foreground"
                    opacity={v / 16 * 0.35}
                  />
                )),
              )}
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