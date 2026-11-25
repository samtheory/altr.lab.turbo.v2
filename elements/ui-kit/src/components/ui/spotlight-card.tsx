"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SpotlightCardProps = React.HTMLAttributes<HTMLDivElement>;

export function SpotlightCard({
  className,
  children,
  onPointerMove,
  ...props
}: SpotlightCardProps) {
  const reduce = useReducedMotion();

  return (
    <div
      data-slot="spotlight-card"
      className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--spot-x", e.clientX - r.left + "px");
        e.currentTarget.style.setProperty("--spot-y", e.clientY - r.top + "px");
        onPointerMove?.(e);
      }}
      {...props}
    >
      {!reduce ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:opacity-100"
          style={{
            background:
              "radial-gradient(280px circle at var(--spot-x,50%) var(--spot-y,50%), color-mix(in oklab, var(--primary) 18%, transparent), transparent 65%)",
          }}
          aria-hidden
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}