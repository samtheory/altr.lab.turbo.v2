"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { durations, easings } from "../../motion/tokens";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type CardPackItem = {
  id: string;
  content: React.ReactNode;
};

export type CardPackProps = {
  children?: React.ReactNode;
  items?: CardPackItem[];
  className?: string;
};

export function CardPack({ children, items, className }: CardPackProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);

  const nodes = items
    ? items.map((item, i) => (
        <div
          key={item.id}
          data-slot="card-pack-card"
          className="flex h-full w-full items-center justify-center rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm"
        >
          {item.content}
        </div>
      ))
    : React.Children.toArray(children);

  const count = nodes.length;
  const fan = hovered && !reduce;

  return (
    <div
      data-slot="card-pack"
      className={cn("relative h-40 w-48", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {nodes.map((node, i) => {
        const mid = (count - 1) / 2;
        const spread = fan ? (i - mid) * 28 : 0;
        const rotate = fan ? (i - mid) * 8 : i * 3 - 3;
        const ty = fan ? -6 : i * -4;

        return (
          <motion.div
            key={items?.[i]?.id ?? i}
            className="absolute inset-0 origin-bottom"
            animate={{ x: spread, y: ty, rotate, zIndex: i }}
            transition={
              reduce ? { duration: 0 } : { duration: durations.base, ease: [...easings.out] }
            }
          >
            {node}
          </motion.div>
        );
      })}
    </div>
  );
}