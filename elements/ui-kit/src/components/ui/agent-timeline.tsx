"use client";

import * as React from "react";
import { Bot, MessageSquare, Wrench } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type AgentTimelineTone = "default" | "success" | "warning" | "info" | "muted";

export type AgentTimelineItem = {
  id: string;
  label: string;
  time?: string;
  tone?: AgentTimelineTone;
  detail?: string;
};

export type AgentTimelineProps = {
  title?: string;
  items?: AgentTimelineItem[];
  autoPlay?: boolean;
  className?: string;
};

const DEMO_ITEMS: AgentTimelineItem[] = [
  { id: "1", label: "User message received", time: "12:41:02", tone: "muted" },
  { id: "2", label: "Planner selected tools", time: "12:41:03", tone: "info", detail: "search + summarize" },
  { id: "3", label: "Tool call finished", time: "12:41:05", tone: "default" },
  { id: "4", label: "Reply drafted", time: "12:41:06", tone: "success" },
];

const STEP = 700;
const TICK = 50;
const HOLD = 2400;

const toneDot: Record<AgentTimelineTone, string> = {
  default: "bg-foreground",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  muted: "bg-muted-foreground",
};

function toneIcon(tone: AgentTimelineTone | undefined) {
  if (tone === "info") return Wrench;
  if (tone === "muted") return MessageSquare;
  return Bot;
}

/** Vertical agent activity timeline with optional staged reveal. */
export function AgentTimeline({
  title = "Agent activity",
  items: itemsProp,
  autoPlay = false,
  className,
}: AgentTimelineProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const base = itemsProp ?? (autoPlay ? DEMO_ITEMS : []);
  const LOOP = base.length * STEP + HOLD;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  React.useEffect(() => {
    if (!autoPlay || !visible || reduce) return;
    const id = setInterval(() => setTick((t) => (t + TICK) % LOOP), TICK);
    return () => clearInterval(id);
  }, [autoPlay, visible, reduce, LOOP]);

  let visibleCount = base.length;
  if (autoPlay && base.length > 0) {
    const t = reduce ? LOOP - 1 : tick;
    visibleCount = Math.min(base.length, Math.max(1, Math.floor(t / STEP) + 1));
  }

  const items = base.slice(0, visibleCount);

  return (
    <div
      ref={ref}
      data-slot="agent-timeline"
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ol className="relative space-y-0 ps-1">
        {items.map((item, index) => {
          const tone = item.tone ?? "default";
          const Icon = toneIcon(item.tone);
          const last = index === items.length - 1;
          return (
            <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!last ? (
                <span
                  aria-hidden
                  className="absolute start-[11px] top-6 bottom-0 w-px bg-border"
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border-2 border-background",
                  toneDot[tone],
                )}
                aria-hidden
              >
                <Icon className="size-2.5 text-background" strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1 pt-px">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium leading-5">{item.label}</p>
                  {item.time ? (
                    <time className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {item.time}
                    </time>
                  ) : null}
                </div>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                ) : null}
              </div>
            </li>
          );
        })}
        <AnimatePresence>
          {autoPlay && visibleCount < base.length ? (
            <motion.li
              key="pending"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 pb-0 ps-[34px] text-xs text-muted-foreground"
            >
              More events incoming…
            </motion.li>
          ) : null}
        </AnimatePresence>
      </ol>
    </div>
  );
}