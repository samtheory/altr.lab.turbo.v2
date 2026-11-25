"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type MagnifyLensProps = {
  children: React.ReactNode;
  className?: string;
  zoom?: number;
  lensSize?: number;
};

export function MagnifyLens({ children, className, zoom = 1.75, lensSize = 120 }: MagnifyLensProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number; bg: string } | null>(null);

  return (
    <div
      ref={ref}
      data-slot="magnify-lens"
      className={cn("relative overflow-hidden rounded-lg", className)}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        setPos({ x, y, bg: ((x / r.width) * 100).toFixed(1) + "% " + ((y / r.height) * 100).toFixed(1) + "%" });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos ? (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-primary/40 shadow-lg"
          style={{
            width: lensSize,
            height: lensSize,
            left: pos.x - lensSize / 2,
            top: pos.y - lensSize / 2,
            background: "color-mix(in oklab, var(--primary) 12%, transparent)",
            backdropFilter: "blur(0px)",
            transform: "scale(" + zoom + ")",
            transformOrigin: pos.bg,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
