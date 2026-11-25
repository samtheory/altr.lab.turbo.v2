"use client";

import * as React from "react";
import { ListTodo } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Progress } from "./progress";

export type BackgroundTaskStatus = "queued" | "running" | "done" | "failed";

export type BackgroundTask = {
  id: string;
  label: string;
  status?: BackgroundTaskStatus;
  progress?: number;
};

export type BackgroundTasksProps = {
  title?: string;
  tasks?: BackgroundTask[];
  autoPlay?: boolean;
  className?: string;
};

const DEMO: BackgroundTask[] = [
  { id: "1", label: "Index repository", status: "done", progress: 100 },
  { id: "2", label: "Embed documentation", status: "running", progress: 62 },
  { id: "3", label: "Sync MCP tools", status: "queued", progress: 0 },
];

const STEP = 800;
const TICK = 50;

/** List of background jobs with progress and status. */
export function BackgroundTasks({
  title = "Background tasks",
  tasks: tasksProp,
  autoPlay = false,
  className,
}: BackgroundTasksProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const base = tasksProp ?? DEMO;
  const LOOP = STEP * (base.length + 2);

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

  let tasks = base;
  if (autoPlay) {
    const t = reduce ? LOOP - 1 : tick;
    const doneCount = Math.min(base.length, Math.floor(t / STEP));
    tasks = base.map((task, i) => {
      if (i < doneCount) return { ...task, status: "done" as const, progress: 100 };
      if (i === doneCount)
        return {
          ...task,
          status: "running" as const,
          progress: Math.min(99, Math.round(((t % STEP) / STEP) * 100)),
        };
      return { ...task, status: "queued" as const, progress: 0 };
    });
  }

  return (
    <div
      ref={ref}
      data-slot="background-tasks"
      className={cn(
        "w-full max-w-sm rounded-xl border border-border bg-card p-3 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <ListTodo className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      </div>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <motion.li
            key={task.id}
            layout={!reduce}
            className="rounded-lg border border-border px-2.5 py-2"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{task.label}</span>
              <span className="text-[11px] capitalize text-muted-foreground">{task.status ?? "queued"}</span>
            </div>
            <Progress value={task.progress ?? null} className="h-1.5" />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}