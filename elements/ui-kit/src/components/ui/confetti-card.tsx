"use client";

import * as React from "react";
import {
  Coffee,
  Code,
  Heart,
  Leaf,
  Music,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { Card } from "./card";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ConfettiRange = { id: string; label: string; count: number };

const ICONS: LucideIcon[] = [Sparkles, Coffee, Code, Heart, Leaf, Music];
const TONES = [
  "bg-primary text-primary-foreground",
  "bg-primary/20 text-primary",
  "bg-foreground text-background",
  "bg-success/20 text-success",
  "bg-warning/25 text-warning",
  "bg-destructive/20 text-destructive",
];

export type ConfettiCardProps = {
  ranges?: ConfettiRange[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  heading?: React.ReactNode;
  suffix?: React.ReactNode;
  message?: React.ReactNode;
  icons?: LucideIcon[];
  className?: string;
};

type Particle = { id: string; x: number; delay: number; tone: string; Icon: LucideIcon; size: number };

/** Celebration card with raining icon pills and range tabs. */
export function ConfettiCard({
  ranges = [
    { id: "today", label: "Today", count: 12 },
    { id: "week", label: "This week", count: 34 },
  ],
  value,
  defaultValue,
  onValueChange,
  heading = "You completed",
  suffix = "tasks",
  message = "Well done — keep the streak going.",
  icons = ICONS,
  className,
}: ConfettiCardProps) {
  const reduce = useReducedMotion();
  const [inner, setInner] = React.useState(defaultValue ?? ranges[0]?.id);
  const range = value ?? inner;
  const count = ranges.find((r) => r.id === range)?.count ?? 0;
  const [particles, setParticles] = React.useState<Particle[]>([]);
  const stageRef = React.useRef<HTMLDivElement>(null);

  const seed = React.useCallback(
    (n: number) => {
      const next: Particle[] = Array.from({ length: Math.min(n, 28) }, (_, i) => ({
        id: `${range}-${i}-${Date.now()}`,
        x: 8 + Math.random() * 84,
        delay: i * 0.05,
        tone: TONES[i % TONES.length]!,
        Icon: icons[i % icons.length]!,
        size: 28 + Math.random() * 10,
      }));
      setParticles(next);
    },
    [icons, range],
  );

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        seed(count);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [count, seed]);

  React.useEffect(() => {
    seed(count);
  }, [count, seed]);

  function pick(id: string) {
    if (id === range) return;
    if (value === undefined) setInner(id);
    onValueChange?.(id);
  }

  return (
    <Card
      data-slot="confetti-card"
      className={cn("w-full max-w-xs overflow-hidden", className)}
    >
      <div ref={stageRef} className="relative h-[22rem] overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className={cn(
                  "absolute top-0 flex items-center justify-center rounded-full shadow-md ring-2 ring-card",
                  p.tone,
                )}
                style={{ left: `${p.x}%`, width: p.size, height: p.size }}
                initial={reduce ? { y: "70%", opacity: 1 } : { y: "-20%", opacity: 0, rotate: -20 }}
                animate={
                  reduce
                    ? { y: "70%", opacity: 1 }
                    : { y: ["-15%", "72%"], opacity: [0, 1, 1, 0.9], rotate: [-10, 25] }
                }
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 1.8 + Math.random(), delay: p.delay, ease: "easeOut" }
                }
              >
                <p.Icon className="size-[45%]" strokeWidth={2.25} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="relative flex flex-col items-center px-6 pt-24 text-center">
          <h3 className="w-fit text-2xl font-semibold leading-tight tracking-tight">
            {heading}
            <br />
            <span className="tabular-nums">{count}</span> {suffix}
          </h3>
          <p className="mt-4 text-sm text-pretty text-muted-foreground">{message}</p>
          <div
            role="tablist"
            className="relative z-10 mt-5 grid w-full grid-cols-2 rounded-lg bg-muted p-1 text-xs font-medium"
          >
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={range === r.id}
                onClick={() => pick(r.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors",
                  range === r.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
