"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type WaveFieldProps = {
  className?: string;
  children?: React.ReactNode;
  amplitude?: number;
  speed?: number;
};

export function WaveField({
  className,
  children,
  amplitude = 18,
  speed = 1,
}: WaveFieldProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;

    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const color = getComputedStyle(canvas).color || "currentColor";
      const layers = [
        { a: amplitude, w: 0.012, o: 0.18, y: height * 0.45 },
        { a: amplitude * 0.7, w: 0.018, o: 0.14, y: height * 0.55 },
        { a: amplitude * 0.45, w: 0.026, o: 0.1, y: height * 0.65 },
      ];

      for (const layer of layers) {
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 4) {
          const y =
            layer.y +
            Math.sin(x * layer.w + t * speed) * layer.a +
            Math.sin(x * layer.w * 0.4 + t * 0.6) * (layer.a * 0.35);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = layer.o;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduce) {
        t += 0.035;
        raf = requestAnimationFrame(paint);
      }
    };

    paint();
    if (reduce) return;
    return () => cancelAnimationFrame(raf);
  }, [amplitude, reduce, speed]);

  return (
    <PatternFrame
      data-slot="wave-field"
      className={cn("bg-background text-primary", className)}
      pattern={<canvas ref={ref} className="h-full w-full" />}
    >
      {children}
    </PatternFrame>
  );
}
