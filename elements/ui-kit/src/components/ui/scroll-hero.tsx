"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ScrollHeroProps = {
  children: React.ReactNode;
  className?: string;
  /** Total scroll runway as a multiple of viewport height */
  scrollLength?: number;
};

/** Hero with a device-style frame that scales and rotates while the page scrolls. */
export function ScrollHero({
  children,
  className,
  scrollLength = 2.25,
}: ScrollHeroProps) {
  const reduce = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.92, 0.82]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 14]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -48]);

  return (
    <div
      ref={containerRef}
      data-slot="scroll-hero"
      className={cn("relative w-full", className)}
      style={{ height: `${scrollLength * 100}vh` }}
    >
      <div className="sticky top-0 flex h-svh items-center justify-center px-4 py-16">
        <motion.div
          className="w-full max-w-lg origin-center"
          style={
            reduce
              ? undefined
              : {
                  scale,
                  rotateX,
                  y,
                  transformPerspective: 1200,
                }
          }
        >
          <div className="rounded-[1.75rem] border border-border bg-card p-2 shadow-lg ring-1 ring-border/60">
            <div className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-background">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                <span className="size-2 rounded-full bg-destructive/80" aria-hidden />
                <span className="size-2 rounded-full bg-warning/80" aria-hidden />
                <span className="size-2 rounded-full bg-success/80" aria-hidden />
              </div>
              <div className="min-h-[14rem] p-5 sm:min-h-[18rem]">{children}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}