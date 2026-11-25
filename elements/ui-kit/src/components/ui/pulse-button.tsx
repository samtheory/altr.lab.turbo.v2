"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type PulseButtonProps = ButtonProps;

export function PulseButton({ className, children, ...props }: PulseButtonProps) {
  const reduce = useReducedMotion();
  return (
    <Button data-slot="pulse-button" className={cn(!reduce && "apolyx-pulse-button", className)} {...props}>
      {children}
    </Button>
  );
}