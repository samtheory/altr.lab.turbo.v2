"use client";

import * as React from "react";
import { EyeOff, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type GuardrailRuleState = "passed" | "redacted" | "running" | "pending";

export type GuardrailRule = {
  label: string;
  detail?: string;
  state: GuardrailRuleState;
};

export type GuardrailCheckProps = {
  title?: string;
  rules?: GuardrailRule[];
  latencyMs?: number;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_RULES: GuardrailRule[] = [
  { label: "PII detection", detail: "Email and phone patterns", state: "pending" },
  { label: "Secrets scan", detail: "API keys and tokens", state: "pending" },
  { label: "Toxicity filter", detail: "Harassment and slurs", state: "pending" },
  { label: "Policy match", detail: "Finance advice guard", state: "pending" },
];

const STEP = 520;
const TICK = 50;
const HOLD = 2800;

function RuleIcon({ state, reduce }: { state: GuardrailRuleState; reduce: boolean }) {
  if (state === "passed") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-success text-success-foreground">
        <ShieldCheck className="size-3" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (state === "redacted") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-warning/15 text-warning">
        <EyeOff className="size-3" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (state === "running") {
    return (
      <Loader2
        className={cn("size-5 text-muted-foreground", !reduce && "animate-spin")}
        aria-hidden
      />
    );
  }
  return <ShieldOff className="size-5 text-muted-foreground/40" aria-hidden />;
}

/** Progressive guardrail scan with per-rule outcomes. */
export function GuardrailCheck({
  title = "Guardrails",
  rules: rulesProp,
  latencyMs: latencyProp,
  autoPlay = false,
  className,
}: GuardrailCheckProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const base = rulesProp ?? (autoPlay ? DEMO_RULES : []);
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

  let rules = base;
  let latencyMs = latencyProp;

  if (autoPlay && base.length > 0) {
    const t = reduce ? LOOP - 1 : tick;
    const idx = Math.min(base.length - 1, Math.floor(t / STEP));
    const outcomes: GuardrailRuleState[] = ["passed", "passed", "redacted", "passed"];
    rules = base.map((rule, i) => {
      if (i < idx) return { ...rule, state: outcomes[i] ?? "passed" };
      if (i === idx) return { ...rule, state: "running" };
      return { ...rule, state: "pending" };
    });
    if (t >= (base.length - 1) * STEP + STEP * 0.6) {
      rules = base.map((rule, i) => ({ ...rule, state: outcomes[i] ?? "passed" }));
    }
    latencyMs = latencyProp ?? 412;
  }

  const scanning = rules.some((r) => r.state === "running" || r.state === "pending");
  const allDone = rules.length > 0 && rules.every((r) => r.state === "passed" || r.state === "redacted");

  return (
    <div
      ref={ref}
      data-slot="guardrail-check"
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
        {latencyMs !== undefined ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {allDone ? `${latencyMs} ms` : scanning ? "Scanning…" : `${latencyMs} ms`}
          </span>
        ) : scanning ? (
          <span className="text-[11px] text-muted-foreground">Scanning…</span>
        ) : null}
      </div>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {rules.map((rule) => (
            <motion.li
              key={rule.label}
              layout={!reduce}
              data-state={rule.state}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5",
                rule.state === "running" && "border-border bg-muted/50",
              )}
            >
              <RuleIcon state={rule.state} reduce={reduce} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-5">{rule.label}</p>
                {rule.detail ? (
                  <p className="text-xs text-muted-foreground">{rule.detail}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                  rule.state === "passed" && "text-success",
                  rule.state === "redacted" && "text-warning",
                  rule.state === "running" && "text-info",
                  rule.state === "pending" && "text-muted-foreground",
                )}
              >
                {rule.state}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <p className="sr-only" role="status">
        {scanning ? "Guardrail scan in progress" : "Guardrail scan complete"}
      </p>
    </div>
  );
}