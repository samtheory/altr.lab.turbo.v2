"use client";

import * as React from "react";
import { useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type NumberTickerProps = {
  value: number;
  className?: string;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
};

export function NumberTicker({
  value,
  className,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
}: NumberTickerProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = React.useState(reduce ? value : 0);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  const text = `${prefix}${display.toFixed(decimals)}${suffix}`;

  return (
    <span
      ref={ref}
      data-slot="number-ticker"
      className={cn("tabular-nums", className)}
      aria-live="polite"
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text}</span>
    </span>
  );
}