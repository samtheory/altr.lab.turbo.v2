"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TextSwapProps = {
  beforeText: string;
  afterText: string;
  /** Seconds before swap */
  delay?: number;
  duration?: number;
  stagger?: number;
  perspective?: number;
  className?: string;
};

const EASE = [0.7, 0, 0.3, 1] as const;

/** Replaces one multi-line phrase with another via a 3D turn. */
export function TextSwap({
  beforeText,
  afterText,
  delay = 1.8,
  duration = 0.8,
  stagger = 0.12,
  perspective = 1200,
  className,
}: TextSwapProps) {
  const reduce = useReducedMotion();
  const [showAfter, setShowAfter] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const showFinal = reduce || showAfter;
  const text = showFinal ? afterText : beforeText;
  const beforeLines = beforeText.split(/\r?\n/);
  const afterLines = afterText.split(/\r?\n/);
  const lineCount = Math.max(beforeLines.length, afterLines.length);

  React.useEffect(() => {
    if (reduce) return;
    const t = window.setTimeout(() => setShowAfter(true), delay * 1000);
    return () => window.clearTimeout(t);
  }, [delay, reduce]);

  React.useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setWidth(node.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const face = cn(
    "col-start-1 row-start-1 block whitespace-pre [backface-visibility:hidden]",
    className,
  );

  return (
    <span
      className="inline-grid align-baseline"
      style={{ perspective: `${perspective}px`, perspectiveOrigin: "50% 50%" }}
      data-slot="text-swap"
    >
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {text}
      </span>
      <span
        ref={containerRef}
        aria-hidden
        className="grid"
        style={{ transformStyle: "preserve-3d" }}
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <motion.span
            key={index}
            className="relative grid"
            initial={false}
            animate={{ rotateY: showFinal ? -90 : 0 }}
            transition={{ duration: reduce ? 0 : duration, delay: index * stagger, ease: EASE }}
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: `50% 50% ${-width / 2}px`,
            }}
          >
            <span className={face}>{beforeLines[index] || "\u00a0"}</span>
            <span
              className={face}
              style={{
                transformOrigin: "left center",
                transform: "translateX(100%) rotateY(90deg)",
              }}
            >
              {afterLines[index] || "\u00a0"}
            </span>
          </motion.span>
        ))}
      </span>
    </span>
  );
}
