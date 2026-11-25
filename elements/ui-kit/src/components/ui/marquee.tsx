"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type MarqueeProps = {
  className?: string;
  children: React.ReactNode;
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
  duration?: number;
};

/** Infinite scroll track for logos, tags, or cards. */
export function Marquee({
  className,
  children,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  duration = 30,
}: MarqueeProps) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = React.useState(false);

  const items = React.useMemo(
    () =>
      Array.from({ length: repeat }, (_, i) => (
        <div
          key={i}
          className={cn("flex shrink-0 gap-4", vertical && "flex-col")}
          aria-hidden={i > 0 ? true : undefined}
        >
          {children}
        </div>
      )),
    [children, repeat, vertical],
  );

  return (
    <div
      data-slot="marquee"
      className={cn(
        "group flex overflow-hidden",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
      style={{ ["--marquee-duration" as string]: reduce ? "0s" : `${duration}s` }}
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      <div
        className={cn(
          "flex w-max gap-4",
          vertical && "h-max w-full flex-col",
          !reduce && "apolyx-marquee-track",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
        data-reverse={reverse || undefined}
        data-vertical={vertical || undefined}
        style={paused ? { animationPlayState: "paused" } : undefined}
      >
        {items}
      </div>
    </div>
  );
}