"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../lib/utils";
import { Slot } from "../primitives/slot";
import { useReducedMotion } from "./use-reduced-motion";

export type PressableProps = {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
};

export function Pressable({
  className,
  asChild = false,
  children,
  onClick,
  disabled,
  type = "button",
}: PressableProps) {
  const reduced = useReducedMotion();
  if (asChild) {
    return <Slot className={cn(className)}>{children}</Slot>;
  }
  return (
    <motion.button
      type={type}
      className={cn(className)}
      disabled={disabled}
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.97 }}
    >
      {children}
    </motion.button>
  );
}
