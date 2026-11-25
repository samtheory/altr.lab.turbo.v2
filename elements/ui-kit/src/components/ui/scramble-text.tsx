"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export type ScrambleTextProps = { text: string; className?: string; duration?: number };

export function ScrambleText({ text, className, duration = 900 }: ScrambleTextProps) {
  const reduce = useReducedMotion();
  const [out, setOut] = React.useState(text);

  React.useEffect(() => {
    if (reduce) {
      setOut(text);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * text.length);
      const scrambled = Array.from(text)
        .map((ch, i) => (i < settled || ch === " " ? ch : POOL[(i + frame) % POOL.length]!))
        .join("");
      setOut(scrambled);
      frame++;
      if (t < 1) requestAnimationFrame(tick);
      else setOut(text);
    };
    requestAnimationFrame(tick);
  }, [text, duration, reduce]);

  return (
    <span data-slot="scramble-text" className={cn(className)} aria-label={text}>
      {out}
    </span>
  );
}