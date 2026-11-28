"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { PatternFrame } from "./pattern-frame";

export type CanvasRevealProps = {
  className?: string;
  children?: React.ReactNode;
  cols?: number;
  rows?: number;
  /** Slowly reveal dots when idle (no pointer). */
  auto?: boolean;
  dotSize?: number;
  gap?: number;
  revealRadius?: number;
};

function useDotGrid(cols: number, rows: number) {
  return React.useMemo(() => {
    const total = cols * rows;
    return {
      total,
      cols,
      rows,
      opacity: () => new Float32Array(total).fill(1),
    };
  }, [cols, rows]);
}

export function CanvasReveal({
  className,
  children,
  cols = 28,
  rows = 16,
  auto = true,
  dotSize = 3,
  gap = 6,
  revealRadius = 72,
}: CanvasRevealProps) {
  const reduce = useReducedMotion();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const grid = useDotGrid(cols, rows);
  const opacities = React.useRef(grid.opacity());
  const pointer = React.useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const raf = React.useRef(0);

  const paint = React.useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pitch = dotSize + gap;
    const ox = (w - (cols - 1) * pitch) / 2;
    const oy = (h - (rows - 1) * pitch) / 2;
    const style = getComputedStyle(wrap);
    const dot = style.getPropertyValue("--foreground").trim() || "currentColor";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const alpha = reduce ? 0.15 : opacities.current[i] ?? 1;
        if (alpha <= 0.02) continue;
        const cx = ox + col * pitch;
        const cy = oy + row * pitch;
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = dot;
        ctx.beginPath();
        ctx.arc(cx, cy, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }, [cols, dotSize, gap, reduce, rows]);

  const revealAt = React.useCallback(
    (x: number, y: number, radius: number) => {
      const wrap = wrapRef.current;
      if (!wrap || reduce) return;
      const rect = wrap.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const pitch = dotSize + gap;
      const ox = (w - (cols - 1) * pitch) / 2;
      const oy = (h - (rows - 1) * pitch) / 2;
      const r2 = radius * radius;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const cx = ox + col * pitch;
          const cy = oy + row * pitch;
          const dx = cx - x;
          const dy = cy - y;
          if (dx * dx + dy * dy <= r2) {
            opacities.current[i] = Math.max(0, (opacities.current[i] ?? 1) - 0.22);
          }
        }
      }
    },
    [cols, dotSize, gap, reduce, rows],
  );

  React.useEffect(() => {
    if (reduce) {
      paint();
      return;
    }
    opacities.current = grid.opacity();
    let last = performance.now();
    const loop = (now: number) => {
      if (auto && !pointer.current.active) {
        const dt = now - last;
        if (dt > 40) {
          last = now;
          const t = now / 1200;
          const cx = (Math.sin(t) * 0.35 + 0.5) * (wrapRef.current?.clientWidth ?? 200);
          const cy = (Math.cos(t * 0.9) * 0.35 + 0.5) * (wrapRef.current?.clientHeight ?? 120);
          revealAt(cx, cy, revealRadius * 0.65);
        }
      }
      paint();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [auto, grid, paint, reduce, revealAt]);

  return (
    <div
      ref={wrapRef}
      data-slot="canvas-reveal"
      className={cn("relative overflow-hidden rounded-xl", className)}
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
        revealAt(pointer.current.x, pointer.current.y, revealRadius);
      }}
      onPointerLeave={() => {
        pointer.current.active = false;
      }}
    >
      <PatternFrame
        className="min-h-32"
        pattern={
          <div
            className={cn(
              "h-full w-full bg-gradient-to-br from-primary/10 via-muted/40 to-background",
              reduce && "opacity-80",
            )}
          />
        }
      >
        <div className="flex min-h-32 items-center justify-center p-6 text-center">{children}</div>
      </PatternFrame>
      {!reduce ? (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-[2] size-full"
          aria-hidden
        />
      ) : null}
    </div>
  );
}