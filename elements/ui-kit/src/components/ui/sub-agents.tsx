"use client";

import * as React from "react";
import { Bot, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SubAgentStatus = "idle" | "running" | "done" | "error";

export type SubAgentLane = {
  id: string;
  name: string;
  task?: string;
  status?: SubAgentStatus;
};

export type SubAgentsProps = {
  title?: string;
  lanes?: SubAgentLane[];
  autoPlay?: boolean;
  className?: string;
};

const DEMO: SubAgentLane[] = [
  { id: "research", name: "Research", task: "Gather policy docs", status: "done" },
  { id: "billing", name: "Billing", task: "Parse invoice", status: "running" },
  { id: "writer", name: "Writer", task: "Draft reply", status: "idle" },
];

const STEP = 900;
const TICK = 50;

/** Parallel sub-agent lanes with per-lane status cards. */
export function SubAgents({
  title = "Sub-agents",
  lanes: lanesProp,
  autoPlay = false,
  className,
}: SubAgentsProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const base = lanesProp ?? DEMO;
  const LOOP = STEP * base.length;

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

  let lanes = base;
  if (autoPlay) {
    const active = Math.floor((reduce ? LOOP - 1 : tick) / STEP) % base.length;
    lanes = base.map((lane, i) => ({
      ...lane,
      status:
        i < active
          ? ("done" as const)
          : i === active
            ? ("running" as const)
            : ("idle" as const),
    }));
  }

  return (
    <div
      ref={ref}
      data-slot="sub-agents"
      className={cn(
        "w-full max-w-lg rounded-xl border border-border bg-card p-3 text-foreground shadow-xs",
        className,
      )}
    >
      <p className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {lanes.map((lane) => (
          <motion.div
            key={lane.id}
            layout={!reduce}
            className={cn(
              "rounded-lg border border-border px-2.5 py-2",
              lane.status === "running" && "border-primary/40 bg-primary/5",
              lane.status === "done" && "bg-muted/40",
            )}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <Bot className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="text-sm font-semibold">{lane.name}</span>
              {lane.status === "running" ? (
                <Loader2 className="ml-auto size-3 animate-spin text-primary" aria-hidden />
              ) : null}
            </div>
            {lane.task ? <p className="text-[11px] text-muted-foreground">{lane.task}</p> : null}
            <p className="mt-1 text-[10px] font-medium capitalize text-muted-foreground">
              {lane.status ?? "idle"}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}