"use client";

import * as React from "react";
import { Check, ChevronDown, TriangleAlert, Wrench } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";

export type ToolCallState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export type ToolPartLike = {
  type: string;
  state: ToolCallState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export type ToolCallProps = {
  name?: string;
  state?: ToolCallState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  part?: ToolPartLike;
  duration?: number;
  autoPlay?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

const DEMO_NAME = "search_web";
const DEMO_INPUT = { query: "agent UI patterns 2026", maxResults: 3 };
const DEMO_OUTPUT = [
  { title: "Tool calls the user can read", url: "apolyx.dev/components" },
  { title: "Streaming without layout shift", url: "apolyx.dev/docs" },
  { title: "Approvals before side effects", url: "apolyx.dev/blocks" },
];

const TYPE_START = 600;
const CHAR_MS = 28;
const TICK = 50;

function format(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summarize(input: unknown): string {
  if (typeof input === "string") return input;
  if (!input || typeof input !== "object") return "";
  for (const value of Object.values(input)) {
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "";
}

function isElement(value: unknown): value is React.ReactElement {
  return typeof value === "object" && value !== null && "$$typeof" in value;
}

/** Collapsible card for one agent tool call. */
export function ToolCall({
  name: nameProp,
  state: stateProp,
  input: inputProp,
  output: outputProp,
  errorText: errorProp,
  part,
  duration,
  autoPlay = false,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  className,
}: ToolCallProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const open = openProp ?? innerOpen;
  const [tick, setTick] = React.useState(0);

  const demoInput = format(DEMO_INPUT);
  const typed = TYPE_START + demoInput.length * CHAR_MS;
  const RUN = typed + 1400;
  const LOOP = RUN + 3600;

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

  let name = nameProp ?? (part ? part.type.replace(/^tool-/, "") : DEMO_NAME);
  let state: ToolCallState = stateProp ?? part?.state ?? "output-available";
  let inputText = format(inputProp ?? part?.input);
  let output: unknown = outputProp ?? part?.output;
  const errorText = errorProp ?? part?.errorText;
  let ms = duration;

  if (autoPlay) {
    const t = reduce ? LOOP - 1 : tick;
    name = nameProp ?? DEMO_NAME;
    const chars = Math.max(0, Math.floor((t - TYPE_START) / CHAR_MS));
    inputText = demoInput.slice(0, chars);
    output = (
      <ul className="divide-y divide-border rounded-md border border-border text-xs">
        {DEMO_OUTPUT.map((r, i) => (
          <li key={r.title} className="flex items-center gap-2.5 px-3 py-2">
            <span className="grid size-4 shrink-0 place-items-center rounded bg-muted font-mono text-[10px] text-muted-foreground">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
            <span className="shrink-0 text-muted-foreground">{r.url}</span>
          </li>
        ))}
      </ul>
    );
    ms = 1240;
    state = t < typed ? "input-streaming" : t < RUN ? "input-available" : "output-available";
  }

  const running = state === "input-streaming" || state === "input-available";
  const failed = state === "output-error";
  const hasOutput = state === "output-available" && output !== undefined;
  const summary = summarize(autoPlay ? DEMO_INPUT : (inputProp ?? part?.input));

  const statusLabel =
    state === "input-streaming"
      ? "Preparing"
      : state === "input-available"
        ? "Running"
        : state === "output-error"
          ? "Failed"
          : ms !== undefined
            ? `Done · ${(ms / 1000).toFixed(1)}s`
            : "Done";

  return (
    <div
      ref={ref}
      data-slot="tool-call"
      className={cn("w-full max-w-md rounded-xl bg-muted p-1.5 text-foreground", className)}
    >
      <div className="rounded-lg border border-border bg-card shadow-xs">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            if (openProp === undefined) setInnerOpen(!open);
            onOpenChange?.(!open);
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="relative grid size-5 shrink-0 place-items-center" aria-hidden>
            <motion.span
              animate={running && !reduce ? { rotate: [0, -18, 14, 0] } : { rotate: 0 }}
              transition={
                running && !reduce
                  ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
              className={cn(
                "absolute grid size-5 place-items-center rounded-md border border-border bg-background text-muted-foreground",
                running ? "opacity-100" : "opacity-0",
              )}
            >
              <Wrench className="size-3" />
            </motion.span>
            <motion.span
              initial={false}
              animate={
                state === "output-available"
                  ? { scale: 1, opacity: 1 }
                  : { scale: 0.4, opacity: 0 }
              }
              className="absolute grid size-5 place-items-center rounded-md bg-foreground text-background"
            >
              <Check className="size-3" strokeWidth={3} />
            </motion.span>
            <motion.span
              initial={false}
              animate={
                state === "output-error" ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }
              }
              className="absolute grid size-5 place-items-center rounded-md bg-destructive text-destructive-foreground"
            >
              <TriangleAlert className="size-3" strokeWidth={2.5} />
            </motion.span>
          </span>
          <span className="font-mono text-[13px] font-medium">{name}</span>
          {summary ? (
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span>
          ) : (
            <span className="flex-1" />
          )}
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium tabular-nums",
              failed ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
              running && "apolyx-tool-shimmer",
            )}
          >
            {statusLabel}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-300",
              !open && "-rotate-90",
            )}
            aria-hidden
          />
        </button>

        <div
          id={bodyId}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-3 border-t border-border px-3 pt-3 pb-3">
              <div>
                <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Input
                </p>
                <pre className="max-h-48 overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {inputText}
                  {state === "input-streaming" && !reduce ? (
                    <span
                      aria-hidden
                      className="ml-px inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-foreground/60"
                    />
                  ) : null}
                </pre>
              </div>
              <AnimatePresence initial={false}>
                {(hasOutput || failed) && (
                  <motion.div
                    key={failed ? "error" : "output"}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {failed ? (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {errorText ?? "The tool call failed."}
                      </p>
                    ) : isElement(output) ? (
                      output
                    ) : (
                      <pre className="max-h-56 overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                        {format(output)}
                      </pre>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status">
        {running ? `Running ${name}` : failed ? `${name} failed` : `${name} finished`}
      </p>
    </div>
  );
}
