"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ScrollProgressProps = {
  className?: string;
  position?: "top" | "bottom";
  height?: number;
  /** Show a muted track under the fill bar */
  track?: boolean;
  /** Gradient fill instead of flat primary */
  gradient?: boolean;
  /** Section markers as fractions of scroll (0–1), e.g. [0.25, 0.5, 0.75] */
  markers?: number[];
};

export function ScrollProgress({
  className,
  position = "top",
  height = 4,
  track = true,
  gradient = true,
  markers,
}: ScrollProgressProps) {
  const reduce = useReducedMotion();
  const fillRef = React.useRef<HTMLDivElement>(null);
  const smooth = React.useRef(0);
  const target = React.useRef(0);
  const frame = React.useRef(0);

  React.useEffect(() => {
    const read = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      target.current = scrollable > 0 ? doc.scrollTop / scrollable : 0;
    };

    const paint = () => {
      const el = fillRef.current;
      if (!el) return;
      if (reduce) {
        el.style.transform = `scaleX(${target.current})`;
        return;
      }
      const next = smooth.current + (target.current - smooth.current) * 0.14;
      smooth.current = Math.abs(target.current - next) < 0.001 ? target.current : next;
      el.style.transform = `scaleX(${smooth.current})`;
      if (smooth.current !== target.current) {
        frame.current = requestAnimationFrame(paint);
      }
    };

    const onScroll = () => {
      read();
      if (reduce) {
        paint();
        return;
      }
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(paint);
    };

    read();
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [reduce]);

  return (
    <div
      data-slot="scroll-progress"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-50",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
      style={{ height }}
      aria-hidden
    >
      {track ? (
        <div className="absolute inset-0 bg-border/35 backdrop-blur-[1px]" />
      ) : null}
      {markers?.length ? (
        <div className="absolute inset-0">
          {markers.map((m) => (
            <span
              key={m}
              className="absolute top-0 h-full w-px bg-foreground/15"
              style={{ left: `${m * 100}%` }}
            />
          ))}
        </div>
      ) : null}
      <div
        ref={fillRef}
        className={cn(
          "relative h-full origin-left will-change-transform",
          gradient
            ? "bg-[linear-gradient(90deg,var(--primary),color-mix(in_oklch,var(--primary)_55%,var(--foreground)))]"
            : "bg-primary",
        )}
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}