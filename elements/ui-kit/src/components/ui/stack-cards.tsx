"use client";

import * as React from "react";
import { CalendarDays, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { motion, type Transition } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type StackCardItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: string;
};

const TONES = [
  "bg-destructive/15 text-destructive",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-primary/15 text-primary",
];

const DEFAULT_ITEMS: StackCardItem[] = [
  { icon: Phone, title: "Call us anytime", description: "Real people, every day." },
  { icon: Mail, title: "Drop us a line", description: "Replies within the hour." },
  { icon: MessageCircle, title: "Chat with the team", description: "Answers in your browser." },
  { icon: CalendarDays, title: "Book a walkthrough", description: "Thirty minutes, your time." },
  { icon: MapPin, title: "Come say hello", description: "Our door is always open." },
];

const CARD_H = 112;
const DEPTH = 4;
const STEP = 10;
const SHRINK = 0.07;
const DROP = CARD_H + 34;

function stacked(order: number) {
  const k = Math.min(order, DEPTH);
  return { y: -k * STEP, scale: 1 - k * SHRINK, rotate: 0, zIndex: 20 - k, opacity: order > DEPTH ? 0 : 1 };
}

const SETTLE: Transition = { type: "spring", stiffness: 380, damping: 40, mass: 0.8 };
const BOTTOM = 0.42;
const FALL: Transition = {
  duration: 0.7,
  times: [0, BOTTOM, 1],
  ease: ["easeOut", "easeInOut"],
  zIndex: { duration: 0.7, times: [0, BOTTOM, BOTTOM + 0.01, 1], ease: "linear" },
};

function dropped(order: number) {
  const back = stacked(order);
  return {
    animate: {
      y: [0, DROP, back.y],
      rotate: [0, 2, 0],
      scale: [1, 0.97, back.scale],
      zIndex: [30, 30, 0, back.zIndex],
      opacity: [1, 1, back.opacity],
    },
    transition: FALL,
  };
}

export type StackCardsProps = {
  items?: StackCardItem[];
  interval?: number;
  onActiveChange?: (index: number) => void;
  className?: string;
};

/** Stack of cards: front drops away and tucks behind on a loop. */
export function StackCards({
  items = DEFAULT_ITEMS,
  interval = 2000,
  onActiveChange,
  className,
}: StackCardsProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const [cycled, setCycled] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const n = items.length;
  const play = visible && !hovered && !reduce && n > 1;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % n);
      setCycled(true);
    }, interval);
    return () => window.clearInterval(id);
  }, [play, n, interval]);

  const notify = React.useRef(onActiveChange);
  React.useEffect(() => {
    notify.current = onActiveChange;
  });
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    notify.current?.(active);
  }, [active]);

  return (
    <div
      ref={ref}
      data-slot="stack-cards"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn("relative mx-auto h-[312px] w-full max-w-xs", className)}
    >
      <div className="absolute inset-x-0" style={{ top: DEPTH * STEP + 4 }}>
        {items.map((item, i) => {
          const order = (i - active + n) % n;
          const leaving = cycled && n > 1 && order === n - 1;
          const front = order === 0;
          const motionProps = leaving
            ? dropped(order)
            : { animate: stacked(order), transition: SETTLE };
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              aria-hidden={!front}
              initial={false}
              {...motionProps}
              className="absolute inset-x-0 top-0 flex h-28 origin-top items-center rounded-[2.5rem] border border-border bg-card px-5 text-card-foreground shadow-md will-change-transform"
            >
              <motion.div
                initial={false}
                animate={{ opacity: front ? 1 : leaving ? [1, 1, 0] : 0 }}
                transition={leaving ? motionProps.transition : { duration: 0.25 }}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <span
                  className={cn(
                    "grid size-16 shrink-0 place-items-center rounded-full",
                    item.tone ?? TONES[i % TONES.length],
                  )}
                >
                  <Icon className="size-8" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold leading-tight tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
