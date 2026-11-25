"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type PointerFollowProps = {
  /** Content shown inside the follower chip. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  followerClassName?: string;
  /** Offset from the pointer (px). */
  offsetX?: number;
  offsetY?: number;
};

/** Surface that shows a labeled chip following the pointer. */
export function PointerFollow({
  title = "You",
  children,
  className,
  followerClassName,
  offsetX = 16,
  offsetY = 16,
}: PointerFollowProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 320, damping: 28, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 320, damping: 28, mass: 0.4 });

  return (
    <div
      data-slot="pointer-follow"
      className={cn("relative overflow-hidden", className)}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left + offsetX);
        y.set(e.clientY - r.top + offsetY);
      }}
    >
      {children}
      {!reduce && active ? (
        <motion.div
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 z-20 rounded-full border border-border/80 bg-card/95 px-3 py-1 text-xs font-medium text-foreground shadow-md backdrop-blur-sm",
            followerClassName,
          )}
          style={{ x: sx, y: sy }}
        >
          {title}
        </motion.div>
      ) : null}
    </div>
  );
}
