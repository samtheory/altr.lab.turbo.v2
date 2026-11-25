"use client";

import * as React from "react";
import { Code2, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SandboxPreviewStatus = "building" | "running" | "error" | "idle";

export type SandboxPreviewProps = {
  title?: string;
  status?: SandboxPreviewStatus;
  runtime?: string;
  previewLabel?: string;
  /** When true, cycles building → running → idle while in view. */
  autoPlay?: boolean;
  /** Optional live preview content. Falls back to a demo mock when omitted. */
  children?: React.ReactNode;
  className?: string;
};

const TICK = 50;
const HOLD = 1600;

const EASE = [0.22, 1, 0.36, 1] as const;

type Phase = "building" | "app" | "error" | "empty";

function resolvePhase(
  status: SandboxPreviewStatus,
  autoPlay: boolean,
  reduce: boolean,
): Phase {
  if (status === "error") return "error";
  if (status === "building" && !reduce) return "building";
  if (status === "running" || status === "building") return "app";
  if (autoPlay || reduce) return "app";
  return "empty";
}

/** Code sandbox / preview frame chrome with build status. */
export function SandboxPreview({
  title = "Sandbox",
  status: statusProp = "idle",
  runtime = "node · v22",
  previewLabel = "Live preview",
  autoPlay = false,
  children,
  className,
}: SandboxPreviewProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
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

  let status = statusProp;
  if (autoPlay) {
    const phase = Math.floor((reduce ? LOOP - 1 : tick) / HOLD);
    status = (["building", "running", "idle"] as const)[phase] ?? "idle";
  }

  const statusCopy =
    status === "building"
      ? "Building bundle…"
      : status === "running"
        ? "Preview updated"
        : status === "error"
          ? "Build failed"
          : autoPlay || children != null
            ? "Ready"
            : "Waiting for code";

  const phase = resolvePhase(status, autoPlay, !!reduce);

  return (
    <div
      ref={ref}
      data-slot="sandbox-preview"
      data-status={status}
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <Code2 className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-xs font-semibold">{title}</span>
        <span className="text-[11px] text-muted-foreground">{runtime}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {status === "building" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
          {statusCopy}
        </span>
      </div>

      <div className="relative aspect-video overflow-hidden bg-muted/50">
        {children != null ? <div className="absolute inset-0">{children}</div> : null}

        {children == null ? (
          <AnimatePresence mode="wait" initial={false}>
            {phase === "building" ? (
              <motion.div
                key="building"
                className="absolute inset-0 flex flex-col gap-3 p-5"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden
              >
                <div className="h-3 w-1/3 rounded-md bg-foreground/10 apolyx-tool-shimmer" />
                <div className="h-3 w-2/3 rounded-md bg-foreground/10 apolyx-tool-shimmer" />
                <div className="mt-2 flex min-h-0 flex-1 gap-3">
                  <div className="h-full w-1/3 rounded-lg bg-foreground/10 apolyx-tool-shimmer" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3 w-full rounded-md bg-foreground/10 apolyx-tool-shimmer" />
                    <div className="h-3 w-5/6 rounded-md bg-foreground/10 apolyx-tool-shimmer" />
                    <div className="h-3 w-4/5 rounded-md bg-foreground/10 apolyx-tool-shimmer" />
                    <div className="mt-auto h-8 w-24 rounded-md bg-primary/30 apolyx-tool-shimmer" />
                  </div>
                </div>
              </motion.div>
            ) : phase === "error" ? (
              <motion.div
                key="error"
                className="absolute inset-0 grid place-items-center p-6 text-center"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs font-medium text-destructive">Build failed</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Fix the sandbox and rebuild.</p>
              </motion.div>
            ) : phase === "empty" ? (
              <motion.div
                key="empty"
                className="absolute inset-0 grid place-items-center"
                initial={false}
                animate={{ opacity: 1 }}
              >
                <div className="absolute inset-4 rounded-lg border border-dashed border-border bg-background/70" />
                <p className="relative text-xs font-medium text-muted-foreground">{previewLabel}</p>
              </motion.div>
            ) : (
              <motion.div
                key="app"
                className="absolute inset-3 overflow-hidden rounded-lg border border-border bg-background shadow-xs"
                initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-2.5 py-1.5">
                  <span className="size-1.5 rounded-full bg-destructive/70" aria-hidden />
                  <span className="size-1.5 rounded-full bg-chart-4/80" aria-hidden />
                  <span className="size-1.5 rounded-full bg-primary/70" aria-hidden />
                  <span className="ml-2 truncate text-[10px] font-medium text-muted-foreground">
                    {previewLabel}
                  </span>
                  {status === "running" && !reduce ? (
                    <motion.span
                      className="ml-auto size-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      aria-hidden
                    />
                  ) : (
                    <span className="ml-auto size-1.5 rounded-full bg-emerald-500/80" aria-hidden />
                  )}
                </div>
                <div className="grid h-[calc(100%-1.75rem)] grid-cols-[5rem_1fr] gap-2.5 p-2.5">
                  <div className="flex flex-col gap-2 rounded-md bg-muted/70 p-2">
                    <div className="h-2 w-full rounded-sm bg-foreground/20" />
                    <div className="h-2 w-[85%] rounded-sm bg-foreground/12" />
                    <div className="h-2 w-[70%] rounded-sm bg-foreground/12" />
                    <div className="mt-auto rounded-md bg-primary px-1.5 py-1 text-center text-[9px] font-semibold text-primary-foreground">
                      Deploy
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-[11px] font-semibold tracking-tight">Checkout flow</p>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      Preview of the sandbox app after the latest rebuild.
                    </p>
                    <div className="mt-auto grid flex-1 grid-cols-[1fr_3rem] gap-2">
                      <div className="flex items-end gap-1 rounded-md border border-border bg-muted/30 px-2 pb-1.5 pt-3">
                        {[40, 65, 48, 80, 55].map((h, i) => (
                          <motion.span
                            key={i}
                            className="flex-1 origin-bottom rounded-sm bg-primary/55"
                            style={{ height: `${h}%` }}
                            initial={reduce ? false : { scaleY: 0.15 }}
                            animate={{ scaleY: 1 }}
                            transition={{
                              delay: reduce ? 0 : 0.1 + i * 0.05,
                              duration: 0.35,
                              ease: EASE,
                            }}
                            aria-hidden
                          />
                        ))}
                      </div>
                      <div className="rounded-md bg-primary/15 ring-1 ring-primary/25" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
