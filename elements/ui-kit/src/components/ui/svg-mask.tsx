"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SvgMaskProps = {
  className?: string;
  children: React.ReactNode;
  radius?: number;
};

export function SvgMask({ className, children, radius = 120 }: SvgMaskProps) {
  const reduce = useReducedMotion();
  const id = React.useId().replace(/:/g, "");
  const [cursor, setCursor] = React.useState({ x: 0, y: 0 });
  const [size, setSize] = React.useState({ w: 1, h: 1 });
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const r = node.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      setCursor({ x: r.width / 2, y: r.height / 2 });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  if (reduce) {
    return (
      <div data-slot="svg-mask" className={cn("relative overflow-hidden rounded-xl", className)}>
        {children}
      </div>
    );
  }

  const maskId = `${id}-reveal`;

  return (
    <div
      ref={ref}
      data-slot="svg-mask"
      className={cn("relative overflow-hidden rounded-xl border border-border bg-muted/40", className)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      <svg className="absolute size-0" aria-hidden width={size.w} height={size.h}>
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
            <rect width={size.w} height={size.h} fill="black" />
            <circle cx={cursor.x} cy={cursor.y} r={radius} fill="white" />
          </mask>
        </defs>
      </svg>
      <div
        className="absolute inset-0 z-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground"
        aria-hidden
      >
        Move to reveal
      </div>
      <div
        className="relative z-[1] min-h-36 p-6"
        style={{
          maskImage: `url(#${maskId})`,
          WebkitMaskImage: `url(#${maskId})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}