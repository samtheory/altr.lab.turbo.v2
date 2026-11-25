"use client";

import * as React from "react";
import { Globe, ImageIcon, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type BrowserAgentStatus = "idle" | "navigating" | "capturing" | "done";

export type BrowserAgentProps = {
  url?: string;
  status?: BrowserAgentStatus;
  statusLabel?: string;
  screenshotAlt?: string;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_URL = "https://billing.example.com/invoices/4821";
const TICK = 50;
const PHASE = 1200;

/** Browser automation chrome with URL bar, status, and screenshot placeholder. */
export function BrowserAgent({
  url: urlProp,
  status: statusProp = "idle",
  statusLabel,
  screenshotAlt = "Page screenshot preview",
  autoPlay = false,
  className,
}: BrowserAgentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const LOOP = PHASE * 4;

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

  const url = urlProp ?? (autoPlay ? DEMO_URL : "about:blank");
  let status = statusProp;
  if (autoPlay) {
    const phase = Math.floor((reduce ? LOOP - 1 : tick) / PHASE);
    status = (["idle", "navigating", "capturing", "done"] as const)[phase] ?? "done";
  }

  const label =
    statusLabel ??
    (status === "idle"
      ? "Ready"
      : status === "navigating"
        ? "Loading page…"
        : status === "capturing"
          ? "Capturing screenshot…"
          : "Snapshot ready");

  return (
    <div
      ref={ref}
      data-slot="browser-agent"
      data-status={status}
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <Globe className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
          aria-label="Current URL"
        />
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {status === "navigating" || status === "capturing" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : null}
          {label}
        </span>
      </div>
      <div className="relative aspect-video bg-muted/60">
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <ImageIcon className="size-8 opacity-40" aria-hidden />
          <span className="sr-only">{screenshotAlt}</span>
        </div>
        {status === "capturing" && !reduce ? (
          <motion.div
            className="absolute inset-x-0 top-0 h-0.5 bg-primary"
            initial={{ y: 0 }}
            animate={{ y: "100%" }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            aria-hidden
          />
        ) : null}
        {status === "done" ? (
          <div
            className="absolute inset-3 rounded-md border border-dashed border-border bg-background/80"
            role="img"
            aria-label={screenshotAlt}
          />
        ) : null}
      </div>
    </div>
  );
}