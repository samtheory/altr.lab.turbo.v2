"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type SparkleFieldProps = {
  count?: number;
  className?: string;
  children?: React.ReactNode;
};

type Spark = { x: number; y: number; r: number; phase: number; speed: number };

function seed(count: number): Spark[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.6 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 1.4,
  }));
}

export function SparkleField({ count = 64, className, children }: SparkleFieldProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const sparks = React.useRef(seed(count));

  React.useEffect(() => {
    sparks.current = seed(count);
  }, [count]);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = getComputedStyle(canvas).color || "currentColor";

      for (const s of sparks.current) {
        const twinkle = reduce
          ? 0.35
          : 0.15 + (Math.sin(t * s.speed + s.phase) * 0.5 + 0.5) * 0.7;
        ctx.globalAlpha = twinkle;
        const px = s.x * width;
        const py = s.y * height;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduce) {
          ctx.globalAlpha = twinkle * 0.45;
          ctx.fillRect(px - s.r * 2.2, py - 0.5, s.r * 4.4, 1);
          ctx.fillRect(px - 0.5, py - s.r * 2.2, 1, s.r * 4.4);
        }
      }
      ctx.globalAlpha = 1;

      if (!reduce) {
        t += 0.03;
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    if (reduce) return;
    return () => cancelAnimationFrame(raf);
  }, [count, reduce]);

  return (
    <PatternFrame
      data-slot="sparkle-field"
      className={cn("bg-background text-primary", className)}
      pattern={<canvas ref={ref} className="h-full w-full" />}
    >
      {children}
    </PatternFrame>
  );
}
