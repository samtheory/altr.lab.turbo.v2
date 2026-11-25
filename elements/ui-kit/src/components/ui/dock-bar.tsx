"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type DockItemProps = {
  children: React.ReactNode;
  className?: string;
  /** Internal — set by DockBar */
  mouseX?: MotionValue<number>;
  magnification?: number;
  reduce?: boolean | null;
};

export function DockItem({
  children,
  className,
  mouseX,
  magnification = 1.55,
  reduce,
}: DockItemProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const distance = useTransform(mouseX ?? useMotionValue(Infinity), (val) => {
    const el = ref.current;
    if (!el || val === Infinity) return Infinity;
    const { left, width } = el.getBoundingClientRect();
    return val - left - width / 2;
  });
  const scale = useTransform(distance, [-120, 0, 120], [1, magnification, 1]);
  const spring = useSpring(scale, { mass: 0.1, stiffness: 150, damping: 12 });
  const y = useTransform(spring, (s) => (reduce ? 0 : (s - 1) * -14));

  return (
    <motion.div
      ref={ref}
      style={{ scale: reduce ? 1 : spring, y: reduce ? 0 : y }}
      className={cn(
        "flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export type DockBarProps = {
  className?: string;
  children: React.ReactNode;
  magnification?: number;
};

/** macOS-style magnifying icon dock. */
export function DockBar({ className, children, magnification = 1.55 }: DockBarProps) {
  const reduce = useReducedMotion();
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      data-slot="dock-bar"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "inline-flex items-end gap-0.5 rounded-2xl border border-border bg-card/90 px-2 py-2 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement<DockItemProps>(child)
          ? React.cloneElement(child, { mouseX, magnification, reduce })
          : child,
      )}
    </motion.div>
  );
}