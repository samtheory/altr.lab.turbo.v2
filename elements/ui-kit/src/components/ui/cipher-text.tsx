"use client";

import * as React from "react";
import { useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";

export type CipherTextProps = {
  text: string;
  className?: string;
  duration?: number;
};

export function CipherText({ text, className, duration = 1100 }: CipherTextProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [out, setOut] = React.useState(reduce ? text : text.replace(/[^\s]/g, "•"));

  React.useEffect(() => {
    if (reduce || !inView) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * text.length);
      const scrambled = Array.from(text)
        .map((ch, i) => {
          if (ch === " ") return ch;
          if (i < settled) return ch;
          return POOL[(i + frame + settled) % POOL.length]!;
        })
        .join("");
      setOut(scrambled);
      frame++;
      if (t < 1) requestAnimationFrame(tick);
      else setOut(text);
    };
    requestAnimationFrame(tick);
  }, [duration, inView, reduce, text]);

  return (
    <span ref={ref} data-slot="cipher-text" className={cn("font-mono", className)} aria-label={text}>
      {out}
    </span>
  );
}