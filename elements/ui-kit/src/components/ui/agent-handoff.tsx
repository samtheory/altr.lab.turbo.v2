"use client";

import * as React from "react";
import { ArrowRight, Bot, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type AgentHandoffPhase = "routing" | "transferring" | "accepted";

export type AgentHandoffContextItem = {
  label: string;
  value: string;
};

export type AgentHandoffProps = {
  fromAgent?: string;
  toAgent?: string;
  reason?: string;
  contextItems?: AgentHandoffContextItem[];
  phase?: AgentHandoffPhase;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_CONTEXT: AgentHandoffContextItem[] = [
  { label: "Thread", value: "support-8842" },
  { label: "Intent", value: "billing_escalation" },
  { label: "Priority", value: "high" },
];

const HOLD = 2200;
const TICK = 50;

/** Shows routing between agents with context carried across. */
export function AgentHandoff({
  fromAgent = "Triage",
  toAgent = "Billing specialist",
  reason = "Payment dispute needs human policy context.",
  contextItems: contextProp,
  phase: phaseProp = "routing",
  autoPlay = false,
  className,
}: AgentHandoffProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const contextItems = contextProp ?? (autoPlay ? DEMO_CONTEXT : []);
  const LOOP = HOLD * 3;

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

  let phase = phaseProp;
  if (autoPlay) {
    const p = Math.floor((reduce ? LOOP - 1 : tick) / HOLD);
    phase = p === 0 ? "routing" : p === 1 ? "transferring" : "accepted";
  }

  const pulse = phase !== "accepted" && !reduce;

  return (
    <div
      ref={ref}
      data-slot="agent-handoff"
      data-phase={phase}
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Agent handoff
      </p>

      <div className="mb-3 flex items-center justify-center gap-3">
        <AgentChip name={fromAgent} active={phase === "routing"} pulse={pulse && phase === "routing"} />
        <motion.span
          animate={pulse ? { x: [0, 4, 0] } : { x: 0 }}
          transition={pulse ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined}
          className="text-muted-foreground"
          aria-hidden
        >
          {phase === "transferring" ? (
            <Loader2 className={cn("size-4", pulse && "animate-spin")} />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </motion.span>
        <AgentChip
          name={toAgent}
          active={phase === "accepted"}
          pulse={pulse && phase === "transferring"}
        />
      </div>

      <p className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {reason}
      </p>

      {contextItems.length > 0 ? (
        <dl className="space-y-1.5 rounded-lg border border-border px-3 py-2 text-xs">
          {contextItems.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className="mt-3 text-center text-[11px] font-medium text-muted-foreground" role="status">
        {phase === "routing"
          ? "Selecting specialist…"
          : phase === "transferring"
            ? "Transferring context…"
            : "Handoff accepted"}
      </p>
    </div>
  );
}

function AgentChip({
  name,
  active,
  pulse,
}: {
  name: string;
  active?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg border border-border px-2 py-2",
        active && "border-primary/40 bg-primary/5",
        pulse && "apolyx-tool-shimmer",
      )}
    >
      <span className="grid size-8 place-items-center rounded-full bg-muted">
        <Bot className="size-4 text-muted-foreground" aria-hidden />
      </span>
      <span className="max-w-full truncate text-center text-xs font-medium">{name}</span>
    </div>
  );
}