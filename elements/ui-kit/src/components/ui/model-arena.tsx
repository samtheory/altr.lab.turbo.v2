"use client";

import * as React from "react";
import { Scale } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ModelArenaReply = {
  id: string;
  model: string;
  text: string;
  latencyMs?: number;
};

export type ModelArenaProps = {
  title?: string;
  prompt?: string;
  replies?: ModelArenaReply[];
  activeId?: string;
  onSelect?: (replyId: string) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO: ModelArenaReply[] = [
  {
    id: "a",
    model: "Model A",
    text: "Refund the disputed line item and email a summary within policy limits.",
    latencyMs: 820,
  },
  {
    id: "b",
    model: "Model B",
    text: "Escalate to a human reviewer before issuing any refund over $50.",
    latencyMs: 640,
  },
];

const TICK = 50;
const HOLD = 3200;

/** Side-by-side model comparison replies for A/B review. */
export function ModelArena({
  title = "Model arena",
  prompt = "How should we resolve invoice #4821?",
  replies: repliesProp,
  activeId: activeIdProp,
  onSelect,
  autoPlay = false,
  className,
}: ModelArenaProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const replies = repliesProp ?? DEMO;
  const LOOP = HOLD * replies.length;

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

  const activeId =
    activeIdProp ??
    (autoPlay && !reduce
      ? replies[Math.floor((tick % LOOP) / HOLD)]?.id
      : replies[0]?.id);

  return (
    <div
      ref={ref}
      data-slot="model-arena"
      className={cn(
        "w-full max-w-xl rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Scale className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {prompt}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {replies.map((reply) => {
          const active = reply.id === activeId;
          return (
            <motion.button
              key={reply.id}
              type="button"
              layout={!reduce}
              onClick={() => onSelect?.(reply.id)}
              className={cn(
                "rounded-lg border border-border px-3 py-2 text-left transition-colors",
                active && "border-primary bg-primary/5 ring-1 ring-primary/20",
              )}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold">{reply.model}</span>
                {reply.latencyMs != null ? (
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {reply.latencyMs} ms
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed">{reply.text}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}