"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Database,
  Sparkles,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TraceSpanKind = "agent" | "llm" | "tool" | "retrieval";

export type TraceSpan = {
  id: string;
  name: string;
  kind: TraceSpanKind;
  /** Start offset from the beginning of the trace, in ms. */
  start: number;
  /** Duration in ms. */
  duration: number;
  depth?: number;
  error?: string;
  tokens?: number;
  /** Short input preview shown in the detail panel. */
  input?: string;
  /** Short output preview shown in the detail panel. */
  output?: string;
};

export type TraceWaterfallProps = {
  /** Run identifier in the header. */
  traceId?: string;
  spans?: TraceSpan[];
  /** Elapsed ms of a live trace; spans grow and a playhead moves. Leave unset for a finished trace. */
  now?: number;
  /** Span shown in the detail panel at first. */
  defaultSelected?: string;
  onSelect?: (span: TraceSpan) => void;
  /** Loop the scripted demo; stops on interaction and pauses offscreen. */
  autoPlay?: boolean;
  className?: string;
};

const DEFAULT_SPANS: TraceSpan[] = [
  {
    id: "s1",
    name: "agent.run",
    kind: "agent",
    start: 0,
    duration: 3100,
    depth: 0,
    tokens: 4870,
    input: "“Why was Acme billed twice in October?”",
    output: "Answer streamed · 2 citations",
  },
  {
    id: "s2",
    name: "plan",
    kind: "llm",
    start: 40,
    duration: 560,
    depth: 1,
    tokens: 1240,
    input: "system + 3 tools · 1.1k tok",
    output: "3 steps: search → fetch invoice → summarize",
  },
  {
    id: "s3",
    name: "search_docs",
    kind: "retrieval",
    start: 640,
    duration: 470,
    depth: 1,
    input: "q=“duplicate charge october”",
    output: "6 chunks · top score 0.82",
  },
  {
    id: "s4",
    name: "billing-agent",
    kind: "agent",
    start: 1160,
    duration: 760,
    depth: 1,
    tokens: 410,
    input: "handoff · invoice lookup",
    output: "INV-2084 · 2 charges found",
  },
  {
    id: "s5",
    name: "fetch_invoice",
    kind: "tool",
    start: 1200,
    duration: 300,
    depth: 2,
    error: "504 Gateway Timeout",
    input: "GET /invoices/INV-2084",
    output: "504 after 300ms · retrying",
  },
  {
    id: "s6",
    name: "fetch_invoice",
    kind: "tool",
    start: 1540,
    duration: 340,
    depth: 2,
    input: "GET /invoices/INV-2084 (retry 1)",
    output: "200 · 2 line items",
  },
  {
    id: "s7",
    name: "summarize",
    kind: "llm",
    start: 1960,
    duration: 1110,
    depth: 1,
    tokens: 3220,
    input: "6 chunks + invoice · 2.9k tok",
    output: "312 tok · 288 tok/s",
  },
];

/** Kind chrome — chart tokens, no pastel rainbow. */
const KIND = {
  agent: {
    icon: Bot,
    bar: "bg-foreground",
    text: "text-foreground",
    label: "Agent",
  },
  llm: {
    icon: Sparkles,
    bar: "bg-chart-1",
    text: "text-chart-1",
    label: "LLM",
  },
  tool: {
    icon: Wrench,
    bar: "bg-chart-2",
    text: "text-chart-2",
    label: "Tool",
  },
  retrieval: {
    icon: Database,
    bar: "bg-chart-3",
    text: "text-chart-3",
    label: "Retrieval",
  },
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;
const TICK = 100;
const LOOP = 9000;
const START = 300;
const LABEL_W = 132;

function useDemoClock(enabled: boolean, loop: number) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled || !visible) return;
    const id = window.setInterval(() => setElapsed((e) => e + TICK), TICK);
    return () => window.clearInterval(id);
  }, [enabled, visible]);

  return { ref, t: elapsed % loop };
}

function fmt(ms: number) {
  return ms >= 1000
    ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}s`
    : `${Math.round(ms)}ms`;
}

/** Live span waterfall for an agent run. */
export function TraceWaterfall({
  traceId = "run_7f3a",
  spans = DEFAULT_SPANS,
  now: nowProp,
  defaultSelected,
  onSelect,
  autoPlay = false,
  className,
}: TraceWaterfallProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = React.useId();
  const [touched, setTouched] = React.useState(false);
  const [picked, setPicked] = React.useState<string | null>(defaultSelected ?? null);
  const demo = autoPlay && !reduce && !touched && nowProp === undefined;
  const { ref, t } = useDemoClock(demo, LOOP);

  const total = Math.max(...spans.map((s) => s.start + s.duration), 1);
  const now = demo ? Math.max(0, Math.min(total, t - START)) : (nowProp ?? total);
  const live = now < total;
  const selected = demo ? (t >= 4300 ? "s5" : null) : picked;
  const sel = spans.find((s) => s.id === selected);
  const errors = spans.filter((s) => s.error && now >= s.start + s.duration).length;
  const tokens = spans
    .filter((s) => (s.depth ?? 0) > 0 && now >= s.start + s.duration)
    .reduce((a, s) => a + (s.tokens ?? 0), 0);

  const scaleMax = Math.ceil(total / 1000) * 1000 || 1000;
  const pct = (ms: number) => (ms / scaleMax) * 100;
  const ticks = Array.from({ length: scaleMax / 1000 + 1 }, (_, i) => i * 1000);
  const startedCount = spans.filter((s) => now >= s.start).length;

  return (
    <div
      ref={ref}
      data-slot="trace-waterfall"
      className={cn("w-full min-w-[18rem] max-w-md text-sm text-foreground", className)}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-background">
            <Activity className="size-4 text-foreground" aria-hidden />
            {live ? (
              <>
                {!reduce ? (
                  <span
                    className="absolute -top-0.5 -right-0.5 size-2 animate-ping rounded-full bg-chart-2"
                    aria-hidden
                  />
                ) : null}
                <span
                  className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-chart-2"
                  aria-hidden
                />
              </>
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold tracking-tight">Trace</p>
            <p className="truncate font-mono text-[10.5px] text-muted-foreground">
              {traceId} · {startedCount} spans · {tokens.toLocaleString()} tok
              {errors > 0 ? (
                <span className="text-destructive"> · {errors} error</span>
              ) : null}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] tabular-nums",
              live
                ? "border-chart-2/35 bg-chart-2/10 text-foreground"
                : "border-border bg-muted text-muted-foreground",
            )}
            aria-live="polite"
          >
            {live ? (
              <span
                className={cn("size-1.5 rounded-full bg-chart-2", !reduce && "animate-pulse")}
              />
            ) : null}
            {live ? `Live ${fmt(now)}` : `Done ${fmt(total)}`}
          </span>
        </header>

        <div className="flex items-end px-3 pt-3 pb-1">
          <span
            className="shrink-0 pl-1 text-[10px] tracking-wide text-muted-foreground uppercase"
            style={{ width: LABEL_W }}
          >
            Span
          </span>
          <div className="relative h-4 min-w-0 flex-1">
            {ticks.map((ms) => (
              <span
                key={ms}
                className="absolute bottom-0 -translate-x-1/2 font-mono text-[9px] text-muted-foreground tabular-nums first:translate-x-0 last:-translate-x-full"
                style={{ left: `${pct(ms)}%` }}
              >
                {ms / 1000}s
              </span>
            ))}
          </div>
        </div>

        <div className="relative px-3 pb-2" aria-label="Spans">
          <div
            className="pointer-events-none absolute inset-y-0 right-3"
            style={{ left: LABEL_W + 12 }}
            aria-hidden
          >
            {ticks.map((ms) => (
              <span
                key={ms}
                className="absolute inset-y-0 w-px bg-border/50"
                style={{ left: `${pct(ms)}%` }}
              />
            ))}
            {live ? (
              <motion.span
                className="absolute inset-y-0 w-px bg-foreground"
                initial={false}
                animate={{ left: `${pct(now)}%` }}
                transition={{ duration: TICK / 1000, ease: "linear" }}
              >
                <span className="absolute -top-0.5 -left-[3px] size-[7px] rounded-full bg-foreground shadow-[0_0_0_3px_color-mix(in_oklch,var(--foreground)_18%,transparent)]" />
              </motion.span>
            ) : null}
          </div>

          {spans.map((s) => {
            const started = now >= s.start;
            const end = Math.min(now, s.start + s.duration);
            const running = started && now < s.start + s.duration;
            const failed = !!s.error && !running && started;
            const k = KIND[s.kind];
            const Icon = failed ? AlertTriangle : k.icon;
            const isSel = s.id === selected;
            const depth = s.depth ?? 0;
            const barEnd = pct(s.start + s.duration);

            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isSel}
                aria-label={`${s.name}, ${k.label}, ${fmt(s.duration)}${s.error ? `, failed: ${s.error}` : ""}`}
                onClick={() => {
                  setTouched(true);
                  setPicked(isSel ? null : s.id);
                  if (!isSel) onSelect?.(s);
                }}
                className={cn(
                  "relative flex h-7 w-full cursor-pointer items-center rounded-md text-left outline-none transition-[background-color,opacity] duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                  isSel ? "bg-muted" : "hover:bg-muted/55",
                  !started && "opacity-35",
                )}
              >
                <span
                  className="flex shrink-0 items-center gap-1.5 pr-2"
                  style={{ width: LABEL_W, paddingLeft: 4 + depth * 10 }}
                >
                  {depth > 0 ? (
                    <span className="h-px w-1.5 shrink-0 bg-border" aria-hidden />
                  ) : null}
                  <Icon
                    className={cn("size-3 shrink-0", failed ? "text-destructive" : k.text)}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "truncate font-mono text-[10.5px]",
                      depth === 0 && "font-semibold",
                    )}
                  >
                    {s.name}
                  </span>
                </span>
                <span className="relative h-full min-w-0 flex-1">
                  {started ? (
                    <motion.span
                      className={cn(
                        "absolute top-1/2 h-3.5 -translate-y-1/2 overflow-hidden rounded-[4px]",
                        failed ? "bg-destructive" : k.bar,
                        depth === 0 && !failed && "opacity-30",
                        isSel && "ring-2 ring-foreground/65 ring-offset-1 ring-offset-card",
                      )}
                      style={{ left: `${pct(s.start)}%` }}
                      initial={false}
                      animate={{ width: `${Math.max(pct(end - s.start), 0.8)}%` }}
                      transition={{
                        duration: demo ? TICK / 1000 : 0.5,
                        ease: demo ? "linear" : EASE,
                      }}
                    >
                      {running && !reduce ? (
                        <span
                          className="apolyx-trace-stripe absolute inset-0 bg-[repeating-linear-gradient(-45deg,color-mix(in_oklch,var(--background)_45%,transparent)_0_4px,transparent_4px_8px)] bg-[length:11.3px_100%]"
                          aria-hidden
                        />
                      ) : null}
                    </motion.span>
                  ) : null}
                  {started && !running && depth > 0 ? (
                    <motion.span
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 pl-1 font-mono text-[9px] whitespace-nowrap tabular-nums",
                        failed ? "text-destructive" : "text-muted-foreground",
                      )}
                      style={
                        barEnd > 80
                          ? { left: "auto", right: `${100 - pct(s.start)}%`, paddingRight: 4 }
                          : { left: `${barEnd}%` }
                      }
                    >
                      {fmt(s.duration)}
                    </motion.span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {sel ? (
            <motion.div
              key={sel.id}
              id={`${uid}-detail`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="border-t border-border px-4 py-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md px-1.5 py-px text-[10px] font-medium",
                    sel.error
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {sel.error ? "Error" : KIND[sel.kind].label}
                </span>
                <span className="font-mono text-xs font-medium">{sel.name}</span>
                <span className="flex-1" />
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {fmt(sel.duration)}
                  {sel.tokens ? ` · ${sel.tokens.toLocaleString()} tok` : ""}
                </span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-border/70 bg-muted/50 px-2.5 py-2 font-mono text-[10.5px]">
                <dt className="text-muted-foreground">in</dt>
                <dd className="truncate">{sel.input ?? "—"}</dd>
                <dt className="text-muted-foreground">out</dt>
                <dd className={cn("truncate", sel.error && "text-destructive")}>
                  {sel.error ? `${sel.error} · ${sel.output ?? ""}` : (sel.output ?? "—")}
                </dd>
              </dl>
            </motion.div>
          ) : (
            <motion.div
              key="legend"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2.5 text-[10.5px] text-muted-foreground"
            >
              {(Object.keys(KIND) as TraceSpanKind[]).map((key) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-[3px]", KIND[key].bar)} />
                  {KIND[key].label}
                </span>
              ))}
              <span className="ms-auto">Click a span to inspect</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style>{`@keyframes apolyx-trace-stripe{to{background-position:11.3px 0}}.apolyx-trace-stripe{animation:apolyx-trace-stripe .8s linear infinite}`}</style>
    </div>
  );
}
