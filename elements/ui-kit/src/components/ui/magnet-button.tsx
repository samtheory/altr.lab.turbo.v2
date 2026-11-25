"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type MagnetButtonProps = ButtonProps;

export function MagnetButton({ className, children, ...props }: MagnetButtonProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });

  if (reduce) {
    return (
      <Button className={className} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.15);
        y.set((e.clientY - r.top - r.height / 2) * 0.15);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className="inline-block"
    >
      <Button data-slot="magnet-button" className={cn(className)} {...props}>
        {children}
      </Button>
    </motion.div>
  );
}