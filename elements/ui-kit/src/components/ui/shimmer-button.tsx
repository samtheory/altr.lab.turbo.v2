"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ShimmerButtonProps = ButtonProps;

export function ShimmerButton({ className, children, ...props }: ShimmerButtonProps) {
  const reduce = useReducedMotion();
  return (
    <Button
      data-slot="shimmer-button"
      variant="default"
      className={cn(
        "relative overflow-hidden",
        !reduce &&
          "before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-primary-foreground/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}