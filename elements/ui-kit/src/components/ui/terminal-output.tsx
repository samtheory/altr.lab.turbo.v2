"use client";

import * as React from "react";
import { Terminal } from "lucide-react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TerminalLine = {
  text: string;
  tone?: "default" | "command" | "error" | "success";
};

export type TerminalOutputProps = {
  title?: string;
  lines?: TerminalLine[];
  streaming?: boolean;
  autoPlay?: boolean;
  className?: string;
};

const DEMO: TerminalLine[] = [
  { text: "$ pnpm --filter @altr/apolyx typecheck", tone: "command" },
  { text: "> tsc --noEmit" },
  { text: "Checked 214 files in 1.8s", tone: "success" },
];

const START = 400;
const CHAR_MS = 18;
const TICK = 40;
const HOLD = 2800;

/** Styled terminal / shell log panel. */
export function TerminalOutput({
  title = "Terminal",
  lines: linesProp,
  streaming: streamingProp = false,
  autoPlay = false,
  className,
}: TerminalOutputProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  const full = (linesProp ?? DEMO).map((l) => l.text).join("\n");
  const STREAM_END = START + full.length * CHAR_MS;
  const LOOP = STREAM_END + HOLD;

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

  let lines = linesProp ?? DEMO;
  let streaming = streamingProp;
  if (autoPlay) {
    const t = reduce ? LOOP - 1 : tick;
    streaming = t < STREAM_END;
    const chars = Math.max(0, Math.floor((t - START) / CHAR_MS));
    const cut = full.slice(0, chars);
    const parts = cut.split("\n");
    lines = parts.map((text, i) => ({
      text,
      tone: (linesProp ?? DEMO)[i]?.tone ?? "default",
    }));
  }

  return (
    <div
      ref={ref}
      data-slot="terminal-output"
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl border border-border bg-foreground text-background shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-background/15 px-3 py-2 text-xs text-background/70">
        <Terminal className="size-3.5" aria-hidden />
        <span className="font-medium">{title}</span>
      </div>
      <pre
        className="max-h-56 overflow-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed [scrollbar-width:thin]"
        aria-busy={streaming}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              line.tone === "command" && "text-background",
              line.tone === "error" && "text-red-300",
              line.tone === "success" && "text-emerald-300",
              (!line.tone || line.tone === "default") && "text-background/80",
            )}
          >
            {line.text}
            {streaming && i === lines.length - 1 && !reduce ? (
              <span
                aria-hidden
                className="ml-px inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-background/70"
              />
            ) : null}
          </div>
        ))}
      </pre>
    </div>
  );
}
