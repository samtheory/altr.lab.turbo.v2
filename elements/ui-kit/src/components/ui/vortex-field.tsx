"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type VortexFieldProps = {
  count?: number;
  className?: string;
  children?: React.ReactNode;
};

type Particle = { a: number; r: number; s: number; size: number };

function seed(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.05 + Math.random() * 0.55,
    s: 0.004 + Math.random() * 0.012,
    size: 0.6 + Math.random() * 1.8,
  }));
}

export function VortexField({ count = 90, className, children }: VortexFieldProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const parts = React.useRef(seed(count));

  React.useEffect(() => {
    parts.current = seed(count);
  }, [count]);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width, height) * 0.55;
      ctx.fillStyle = getComputedStyle(canvas).color || "currentColor";

      for (const p of parts.current) {
        if (!reduce) {
          p.a += p.s;
          p.r += 0.0008;
          if (p.r > 0.95) p.r = 0.05;
        }
        const x = cx + Math.cos(p.a) * p.r * maxR;
        const y = cy + Math.sin(p.a) * p.r * maxR * 0.72;
        ctx.globalAlpha = 0.15 + (1 - p.r) * 0.45;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    draw();
    if (reduce) return;
    return () => cancelAnimationFrame(raf);
  }, [count, reduce]);

  return (
    <PatternFrame
      data-slot="vortex-field"
      className={cn("bg-background text-primary", className)}
      pattern={<canvas ref={ref} className="h-full w-full" />}
    >
      {children}
    </PatternFrame>
  );
}
