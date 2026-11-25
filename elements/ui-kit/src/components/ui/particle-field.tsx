"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type ParticleFieldProps = {
  count?: number;
  className?: string;
  children?: React.ReactNode;
};

type Dot = { x: number; y: number; r: number; vy: number; vx: number };

function seedDots(count: number): Dot[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.5 + Math.random() * 1.5,
    vy: 0.02 + Math.random() * 0.04,
    vx: (Math.random() - 0.5) * 0.02,
  }));
}

export function ParticleField({
  count = 48,
  className,
  children,
}: ParticleFieldProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const dots = React.useRef(seedDots(count));

  React.useEffect(() => {
    if (reduce) return;
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
      const style = getComputedStyle(canvas);
      ctx.fillStyle = style.color || "currentColor";
      for (const p of dots.current) {
        p.y -= p.vy * 0.016;
        p.x += p.vx * 0.016;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <PatternFrame
      data-slot="particle-field"
      className={cn("text-foreground", className)}
      pattern={
        <canvas
          ref={ref}
          className={cn("h-full w-full", reduce && "opacity-40")}
        />
      }
    >
      {children}
    </PatternFrame>
  );
}