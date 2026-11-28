"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { durations, easings } from "../../motion/tokens";
import { useReducedMotion } from "../../motion/use-reduced-motion";

type Edge = "top" | "right" | "bottom" | "left";

const edgeOrigin: Record<Edge, { x: string; y: string }> = {
  top: { x: "0%", y: "-100%" },
  right: { x: "100%", y: "0%" },
  bottom: { x: "0%", y: "100%" },
  left: { x: "-100%", y: "0%" },
};

function detectEdge(e: React.PointerEvent<HTMLDivElement>): Edge {
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const d = { top: y, right: r.width - x, bottom: r.height - y, left: x };
  return (Object.entries(d).sort((a, b) => a[1] - b[1])[0][0] as Edge);
}

export type DirectionHoverProps = {
  children: React.ReactNode;
  overlay: React.ReactNode;
  className?: string;
};

export function DirectionHover({ children, overlay, className }: DirectionHoverProps) {
  const reduce = useReducedMotion();
  const [edge, setEdge] = React.useState<Edge | null>(null);
  const [hovered, setHovered] = React.useState(false);

  const showOverlay = hovered;

  return (
    <div
      data-slot="direction-hover"
      className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}
      onPointerEnter={(e) => {
        setEdge(detectEdge(e));
        setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="relative z-10">{children}</div>
      {reduce && showOverlay ? (
        <div
          data-slot="direction-hover-overlay"
          className="absolute inset-0 z-20 flex items-center justify-center bg-primary/90 text-primary-foreground"
        >
          {overlay}
        </div>
      ) : !reduce ? (
        <AnimatePresence>
          {showOverlay && edge ? (
            <motion.div
              key="overlay"
              data-slot="direction-hover-overlay"
              className="absolute inset-0 z-20 flex items-center justify-center bg-primary/90 text-primary-foreground"
              initial={{ x: edgeOrigin[edge].x, y: edgeOrigin[edge].y, opacity: 0.85 }}
              animate={{ x: "0%", y: "0%", opacity: 1 }}
              exit={{ x: edgeOrigin[edge].x, y: edgeOrigin[edge].y, opacity: 0 }}
              transition={{ duration: durations.base, ease: [...easings.out] }}
            >
              {overlay}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </div>
  );
}