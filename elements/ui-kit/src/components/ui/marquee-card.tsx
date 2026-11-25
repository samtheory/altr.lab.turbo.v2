"use client";

import * as React from "react";
import {
  Contrast,
  LayoutGrid,
  Moon,
  Palette,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react";
import { animate, useAnimate, type AnimationPlaybackControls } from "motion/react";

import { cn } from "../../lib/utils";
import { Card, CardContent } from "./card";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type MarqueeTag = { label: string; icon: LucideIcon };
export type MarqueeRow = { tags: MarqueeTag[]; duration: number; offset: string };

const DEFAULT_ROWS: MarqueeRow[] = [
  {
    duration: 34,
    offset: "-8%",
    tags: [
      { label: "Dark mode", icon: Moon },
      { label: "High contrast", icon: Contrast },
      { label: "Serif type", icon: Type },
      { label: "Bento grid", icon: LayoutGrid },
    ],
  },
  {
    duration: 40,
    offset: "-22%",
    tags: [
      { label: "Gradient", icon: Palette },
      { label: "Sparkly", icon: Sparkles },
      { label: "Soft shadow", icon: Contrast },
      { label: "Editorial", icon: Type },
    ],
  },
  {
    duration: 36,
    offset: "-4%",
    tags: [
      { label: "Minimal", icon: LayoutGrid },
      { label: "Playful", icon: Sparkles },
      { label: "Neon", icon: Moon },
      { label: "Pastel", icon: Palette },
    ],
  },
];

export type MarqueeCardProps = {
  rows?: MarqueeRow[];
  title?: string;
  description?: string;
  hoverSpeed?: number;
  className?: string;
};

/** Feature card with alternating marquee rows that slow on hover. */
export function MarqueeCard({
  rows = DEFAULT_ROWS,
  title = "Find your look",
  description = "Mix a few moods and every component restyles itself to match your brand.",
  hoverSpeed = 0.25,
  className,
}: MarqueeCardProps) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Card
      data-slot="marquee-card"
      className={cn("w-full max-w-sm overflow-hidden", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        aria-hidden
        className="flex flex-col gap-3 pt-10 pb-4 [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
      >
        {rows.map((row, i) => (
          <Row
            key={i}
            {...row}
            reverse={i % 2 === 0}
            slow={hovered}
            hoverSpeed={hoverSpeed}
          />
        ))}
      </div>
      <CardContent className="px-7 pt-2 pb-8">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-60 text-pretty text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Row({
  tags,
  duration,
  offset,
  reverse,
  slow,
  hoverSpeed,
}: MarqueeRow & { reverse: boolean; slow: boolean; hoverSpeed: number }) {
  const reduce = useReducedMotion();
  const [scope, animateRow] = useAnimate<HTMLDivElement>();
  const loop = React.useRef<AnimationPlaybackControls | null>(null);
  const items = [...tags, ...tags];

  React.useEffect(() => {
    if (reduce) return;
    const controls = animateRow(
      scope.current,
      {
        transform: reverse
          ? ["translateX(-50%)", "translateX(0%)"]
          : ["translateX(0%)", "translateX(-50%)"],
      },
      { duration, ease: "linear", repeat: Infinity },
    );
    loop.current = controls;
    return () => controls.stop();
  }, [reduce, reverse, duration, animateRow, scope]);

  React.useEffect(() => {
    const controls = loop.current;
    if (!controls) return;
    const tween = animate(controls.speed, slow ? hoverSpeed : 1, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => {
        controls.speed = v;
      },
    });
    return () => tween.stop();
  }, [slow, hoverSpeed]);

  return (
    <div className="overflow-hidden" style={{ marginLeft: offset }}>
      <div ref={scope} className="flex w-max py-1">
        {items.map((tag, i) => (
          <span
            key={i}
            className="mr-2.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-background px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap shadow-sm ring-1 ring-border"
          >
            <tag.icon className="size-3.5 text-foreground/80" aria-hidden />
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  );
}
