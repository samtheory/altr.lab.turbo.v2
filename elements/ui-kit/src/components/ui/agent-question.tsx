"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type AgentQuestionOption = {
  id: string;
  label: string;
  description?: string;
};

export type AgentQuestionProps = {
  question?: string;
  options?: AgentQuestionOption[];
  onSelect?: (optionId: string) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_OPTIONS: AgentQuestionOption[] = [
  { id: "a", label: "Refund the charge", description: "Issue a partial refund" },
  { id: "b", label: "Escalate to billing", description: "Hand off to a specialist" },
  { id: "c", label: "Send documentation", description: "Email policy links only" },
];

const HOLD = 2400;
const TICK = 50;

/** Card where the agent asks a clarifying question with choice buttons. */
export function AgentQuestion({
  question = "How should I handle this disputed invoice?",
  options: optionsProp,
  onSelect,
  autoPlay = false,
  className,
}: AgentQuestionProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const options = optionsProp ?? DEMO_OPTIONS;
  const LOOP = HOLD * (options.length + 1);

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

  const highlightIndex =
    autoPlay && !reduce
      ? Math.floor((tick % LOOP) / HOLD) - 1
      : -1;

  return (
    <div
      ref={ref}
      data-slot="agent-question"
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-primary/10 text-primary"
          aria-hidden
        >
          <HelpCircle className="size-4" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-medium leading-relaxed">{question}</p>
      </div>
      <ul className="space-y-2" role="listbox" aria-label="Answer options">
        {options.map((opt, i) => (
          <motion.li key={opt.id} layout={!reduce}>
            <Button
              type="button"
              variant={highlightIndex === i ? "default" : "outline"}
              size="sm"
              className="h-auto w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
              onClick={() => onSelect?.(opt.id)}
              role="option"
              aria-selected={highlightIndex === i}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.description ? (
                <span className="text-xs font-normal text-muted-foreground">{opt.description}</span>
              ) : null}
            </Button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}