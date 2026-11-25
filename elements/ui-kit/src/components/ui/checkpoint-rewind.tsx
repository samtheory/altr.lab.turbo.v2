"use client";

import * as React from "react";
import { Clock, FileCode, History, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type CheckpointKind = "message" | "code" | "full";

export type Checkpoint = {
  id: string;
  label: string;
  time: string;
  kind: CheckpointKind;
  files?: string[];
};

export type CheckpointRestoreMode = "code" | "all";

export type CheckpointRewindProps = {
  title?: string;
  checkpoints?: Checkpoint[];
  onRestore?: (id: string, mode: CheckpointRestoreMode) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_CHECKPOINTS: Checkpoint[] = [
  {
    id: "c1",
    label: "Initial prompt",
    time: "12:38",
    kind: "message",
  },
  {
    id: "c2",
    label: "API route drafted",
    time: "12:39",
    kind: "code",
    files: ["src/api/chat.ts", "src/lib/tools.ts"],
  },
  {
    id: "c3",
    label: "Tests added",
    time: "12:41",
    kind: "full",
    files: ["src/api/chat.test.ts"],
  },
];

const STEP = 1100;
const TICK = 50;
const HOLD = 3000;

const kindIcon: Record<CheckpointKind, typeof History> = {
  message: History,
  code: FileCode,
  full: Clock,
};

/** Timeline of conversation checkpoints with restore actions. */
export function CheckpointRewind({
  title = "Checkpoints",
  checkpoints: checkpointsProp,
  onRestore,
  autoPlay = false,
  className,
}: CheckpointRewindProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const base = checkpointsProp ?? (autoPlay ? DEMO_CHECKPOINTS : []);
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

  let checkpoints = base;
  let highlightId: string | null = null;
  if (autoPlay && base.length > 0) {
    const t = reduce ? LOOP - 1 : tick;
    const count = Math.min(base.length, Math.max(1, Math.floor(t / STEP) + 1));
    checkpoints = base.slice(0, count);
    highlightId = checkpoints[checkpoints.length - 1]?.id ?? null;
  }

  React.useEffect(() => {
    if (autoPlay && highlightId) setActiveId(highlightId);
  }, [autoPlay, highlightId]);

  function restore(id: string, mode: CheckpointRestoreMode) {
    onRestore?.(id, mode);
    if (!autoPlay) setActiveId(id);
  }

  return (
    <div
      ref={ref}
      data-slot="checkpoint-rewind"
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <p className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <RotateCcw className="size-3.5" aria-hidden />
        {title}
      </p>

      <ol className="space-y-2">
        <AnimatePresence initial={false}>
          {checkpoints.map((cp) => {
            const Icon = kindIcon[cp.kind];
            const active = activeId === cp.id;
            return (
              <motion.li
                key={cp.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                data-active={active ? "" : undefined}
                className={cn(
                  "rounded-lg border border-border px-3 py-2.5",
                  active && "border-primary/35 bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
                    <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{cp.label}</p>
                      <time className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {cp.time}
                      </time>
                    </div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {cp.kind}
                    </p>
                    {cp.files?.length ? (
                      <ul className="mt-1.5 space-y-0.5 font-mono text-[10px] text-muted-foreground">
                        {cp.files.map((f) => (
                          <li key={f} className="truncate">
                            {f}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
                {onRestore ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="flex-1"
                      onClick={() => restore(cp.id, "code")}
                    >
                      Restore code
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => restore(cp.id, "all")}
                    >
                      Restore all
                    </Button>
                  </div>
                ) : null}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      {!onRestore && autoPlay ? (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Demo checkpoints — wire <code className="font-mono">onRestore</code> to rewind.
        </p>
      ) : null}
    </div>
  );
}