"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type EdgeFadeBlurProps = React.HTMLAttributes<HTMLDivElement> & {
  fade?: number;
};

export function EdgeFadeBlur({ className, children, fade = 48, ...props }: EdgeFadeBlurProps) {
  return (
    <div data-slot="edge-fade-blur" className={cn("relative", className)} {...props}>
      <div
        className="pointer-events-none sticky top-0 z-10 h-0 w-full"
        style={{
          boxShadow: "0 " + fade + "px " + fade + "px -" + fade / 2 + "px color-mix(in oklab, var(--background) 90%, transparent) inset",
        }}
        aria-hidden
      />
      {children}
      <div
        className="pointer-events-none sticky bottom-0 z-10 h-0 w-full"
        style={{
          boxShadow: "0 -" + fade + "px " + fade + "px -" + fade / 2 + "px color-mix(in oklab, var(--background) 90%, transparent) inset",
        }}
        aria-hidden
      />
    </div>
  );
}
