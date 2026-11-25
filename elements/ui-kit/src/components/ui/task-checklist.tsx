"use client";

import * as React from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TaskItem = {
  id: string;
  label: string;
  status?: "pending" | "running" | "done";
};

export type TaskChecklistProps = {
  title?: string;
  items?: TaskItem[];
  autoPlay?: boolean;
  className?: string;
};

const DEMO: TaskItem[] = [
  { id: "1", label: "Parse the request", status: "done" },
  { id: "2", label: "Gather sources", status: "done" },
  { id: "3", label: "Draft the answer", status: "running" },
  { id: "4", label: "Cite references", status: "pending" },
];

const STEP = 900;
const TICK = 50;
const HOLD = 2400;

/** Agent task checklist with pending / running / done states. */
export function TaskChecklist({
  title = "Tasks",
  items: itemsProp,
  autoPlay = false,
  className,
}: TaskChecklistProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const base = itemsProp ?? DEMO;
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

  let items = base;
  if (autoPlay) {
    const t = reduce ? LOOP - 1 : tick;
    const doneCount = Math.min(base.length, Math.floor(t / STEP));
    items = base.map((item, i) => ({
      ...item,
      status: i < doneCount ? "done" : i === doneCount ? "running" : "pending",
    }));
  }

  return (
    <div
      ref={ref}
      data-slot="task-checklist"
      className={cn(
        "w-full max-w-sm rounded-xl border border-border bg-card p-3 text-foreground shadow-xs",
        className,
      )}
    >
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout={!reduce}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm"
            >
              <span className="grid size-5 place-items-center" aria-hidden>
                {item.status === "done" ? (
                  <span className="grid size-4 place-items-center rounded-full bg-foreground text-background">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                ) : item.status === "running" ? (
                  <Loader2
                    className={cn(
                      "size-4 text-muted-foreground",
                      !reduce && "animate-spin",
                    )}
                  />
                ) : (
                  <Circle className="size-4 text-muted-foreground/50" />
                )}
              </span>
              <span
                className={cn(
                  item.status === "done" && "text-muted-foreground line-through",
                  item.status === "pending" && "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
