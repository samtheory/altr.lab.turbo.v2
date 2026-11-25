"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

const DOTS = "M8 12h1v1H8zm4 0h1v1h-1zm8 2h1v1h-1zm12 4h1v1h-1zm-6 6h1v1h-1zm14 0h1v1h-1zm-20 8h1v1h-1zm24 2h1v1h-1z";

export type DotMapProps = {
  className?: string;
};

export function DotMap({ className }: DotMapProps) {
  return (
    <svg data-slot="dot-map" viewBox="0 0 120 48" className={cn("w-full fill-current", className)} role="img" aria-label="World map">
      <rect width="120" height="48" fill="none" />
      {Array.from({ length: 80 }, (_, i) => (
        <circle key={i} cx={(i * 17) % 118 + 1} cy={(i * 11) % 46 + 1} r={0.65} />
      ))}
    </svg>
  );
}
