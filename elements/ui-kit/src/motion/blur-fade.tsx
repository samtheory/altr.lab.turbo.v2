"use client";

import * as React from "react";
import { useInView } from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "./use-reduced-motion";

export type BlurFadeProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  blur?: number;
  offset?: number;
  once?: boolean;
  as?: React.ElementType;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 600,
  blur = 8,
  offset = 8,
  once = true,
  as: Tag = "div",
}: BlurFadeProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once, amount: 0.2 });
  const shown = reduce || inView;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-slot="blur-fade"
      className={cn(className)}
      style={{
        transitionProperty: "opacity, transform, filter",
        transitionTimingFunction: EASE,
        transitionDuration: reduce ? "0ms" : `${duration}ms`,
        transitionDelay: shown && !reduce ? `${delay}ms` : "0ms",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${offset}px)`,
        filter: shown ? "blur(0)" : `blur(${blur}px)`,
      }}
    >
      {children}
    </Tag>
  );
}