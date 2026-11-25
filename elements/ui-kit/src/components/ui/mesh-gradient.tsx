"use client";

import type * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type MeshGradientProps = {
  className?: string;
  children?: React.ReactNode;
};

export function MeshGradient({ className, children }: MeshGradientProps) {
  const reduce = useReducedMotion();

  return (
    <PatternFrame
      data-slot="mesh-gradient"
      className={cn("bg-background", className)}
      pattern={
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "absolute -top-1/3 left-1/4 size-[70%] rounded-full bg-primary/25 blur-3xl",
              !reduce && "apolyx-mesh-blob",
            )}
            aria-hidden
          />
          <div
            className={cn(
              "absolute top-1/4 -right-1/4 size-[65%] rounded-full bg-primary/15 blur-3xl",
              !reduce && "apolyx-mesh-blob apolyx-mesh-blob-b",
            )}
            aria-hidden
          />
          <div
            className={cn(
              "absolute -bottom-1/4 left-0 size-[55%] rounded-full bg-muted-foreground/15 blur-3xl",
              !reduce && "apolyx-mesh-blob apolyx-mesh-blob-c",
            )}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,color-mix(in_oklab,var(--background)_85%,transparent)_100%)]"
            aria-hidden
          />
        </div>
      }
    >
      {children}
    </PatternFrame>
  );
}
