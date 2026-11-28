"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type Pin3DProps = {
  title?: string;
  href?: string;
  className?: string;
  children?: React.ReactNode;
};

export function Pin3D({ title, href, className, children }: Pin3DProps) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 300, damping: 24 });
  const sry = useSpring(ry, { stiffness: 300, damping: 24 });
  const rotateX = useTransform(srx, (v) => `${v}deg`);
  const rotateY = useTransform(sry, (v) => `${v}deg`);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 18);
    rx.set(-py * 14);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const shell = (
    <motion.div
      data-slot="pin-3d"
      className={cn(
        "rounded-xl border border-border bg-card p-6 text-center",
        className,
      )}
      style={
        reduce
          ? undefined
          : { perspective: 800, transformStyle: "preserve-3d", rotateX, rotateY }
      }
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div
        data-slot="pin-3d-marker"
        className="mx-auto mb-3 size-3 rounded-full bg-primary shadow-md ring-4 ring-primary/20"
      />
      {children}
      {title ? <p className="mt-2 text-sm font-medium text-foreground">{title}</p> : null}
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} className="block" data-slot="pin-3d-link">
        {shell}
      </a>
    );
  }

  return shell;
}