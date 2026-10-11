"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "../lib/utils";
import { durations, easings } from "./tokens";
import { useReducedMotion } from "./use-reduced-motion";

export type HoverLiftProps = HTMLMotionProps<"div">;

export function HoverLift({ className, children, ...props }: HoverLiftProps) {
  const reduced = useReducedMotion();
  const [finePointer, setFinePointer] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const enabled = !reduced && finePointer;

  return (
    <motion.div
      className={cn(className)}
      whileHover={enabled ? { y: -2 } : undefined}
      whileFocus={enabled ? { y: -2 } : undefined}
      transition={{ duration: durations.fast, ease: [...easings.out] }}
      style={enabled ? { boxShadow: "var(--shadow-sm)" } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
