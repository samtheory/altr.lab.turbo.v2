"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type ParticleDriftProps = {
  count?: number;
  className?: string;
  children?: React.ReactNode;
};

type DriftDot = { x: number; y: number; z: number; vx: number; vy: number; phase: number };

function seedDots(count: number): DriftDot[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random(),
    vx: (Math.random() - 0.5) * 0.018,
    vy: 0.01 + Math.random() * 0.035,
    phase: Math.random() * Math.PI * 2,
  }));
}

export function ParticleDrift({
  count = 56,
  className,
  children,
}: ParticleDriftProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const dots = React.useRef(seedDots(count));
  const lastFrame = React.useRef(0);

  React.useEffect(() => {
    dots.current = seedDots(count);
  }, [count]);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    lastFrame.current = 0;

    const draw = (now: number) => {
      const dt = reduce
        ? 0
        : Math.min(0.04, (now - (lastFrame.current || now)) / 1000 || 0.016);
      lastFrame.current = now;

      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const style = getComputedStyle(canvas);
      ctx.fillStyle = style.color || "currentColor";

      const sorted = [...dots.current].sort((a, b) => a.z - b.z);

      for (const p of sorted) {
        if (!reduce) {
          const wobble = Math.sin(now * 0.001 + p.phase) * 0.012;
          p.x += (p.vx + wobble) * (dt * 60);
          p.y -= p.vy * (0.35 + p.z * 0.65) * (dt * 60);
          if (p.y < -0.06) {
            p.y = 1.06;
            p.x = Math.random();
            p.z = Math.random();
          }
          if (p.x < -0.05) p.x = 1.05;
          if (p.x > 1.05) p.x = -0.05;
        }

        const depth = 0.35 + p.z * 0.65;
        const radius = (0.6 + p.z * 2.4) * depth;
        const px = p.x * width;
        const py = p.y * height;

        ctx.globalAlpha = 0.15 + p.z * 0.45;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduce, count]);

  return (
    <PatternFrame
      data-slot="particle-drift"
      className={cn("text-foreground [perspective:900px]", className)}
      pattern={
        <canvas
          ref={ref}
          className={cn("h-full w-full", reduce && "opacity-50")}
        />
      }
    >
      {children}
    </PatternFrame>
  );
}