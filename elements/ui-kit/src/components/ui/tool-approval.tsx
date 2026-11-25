"use client";

import * as React from "react";
import { Ban, Check, ShieldAlert, Wrench } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type ToolApprovalStatus = "pending" | "approved" | "denied";

export type ToolApprovalDetail = {
  label: string;
  value: string;
};

export type ToolApprovalProps = {
  title?: string;
  description?: string;
  toolName?: string;
  details?: ToolApprovalDetail[];
  status?: ToolApprovalStatus;
  onApprove?: () => void;
  onDeny?: () => void;
  approveLabel?: string;
  denyLabel?: string;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_DETAILS: ToolApprovalDetail[] = [
  { label: "Target", value: "billing/invoices" },
  { label: "Action", value: "create_refund" },
  { label: "Amount", value: "$42.00" },
];

const HOLD = 3200;
const TICK = 50;

/** Card that asks the user to approve or deny a side-effecting tool call. */
export function ToolApproval({
  title = "Approval required",
  description = "The agent wants to run a tool that changes external state.",
  toolName: toolNameProp,
  details: detailsProp,
  status: statusProp = "pending",
  onApprove,
  onDeny,
  approveLabel = "Approve",
  denyLabel = "Deny",
  autoPlay = false,
  className,
}: ToolApprovalProps) {
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

  const toolName = toolNameProp ?? (autoPlay ? "refund_payment" : "tool");
  const details = detailsProp ?? (autoPlay ? DEMO_DETAILS : []);

  let status = statusProp;
  if (autoPlay) {
    const phase = Math.floor((reduce ? LOOP - 1 : tick) / HOLD);
    status = phase === 0 ? "pending" : phase === 1 ? "approved" : "denied";
  }

  const decided = status !== "pending";

  return (
    <div
      ref={ref}
      data-slot="tool-approval"
      data-status={status}
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border border-border",
            status === "pending" && "bg-warning/10 text-warning",
            status === "approved" && "bg-success/10 text-success",
            status === "denied" && "bg-destructive/10 text-destructive",
          )}
          aria-hidden
        >
          {status === "approved" ? (
            <Check className="size-4" strokeWidth={2.5} />
          ) : status === "denied" ? (
            <Ban className="size-4" strokeWidth={2.5} />
          ) : (
            <ShieldAlert className="size-4" strokeWidth={2.5} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wrench className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="font-mono text-[13px]">{toolName}</span>
          <span
            className={cn(
              "ml-auto inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium tabular-nums",
              status === "pending" && "bg-warning/15 text-warning",
              status === "approved" && "bg-success/15 text-success",
              status === "denied" && "bg-destructive/15 text-destructive",
              status === "pending" && !reduce && "apolyx-tool-shimmer",
            )}
          >
            {status === "pending" ? "Awaiting you" : status === "approved" ? "Approved" : "Denied"}
          </span>
        </div>
      </div>

      {details.length > 0 ? (
        <dl className="mb-3 space-y-1.5 rounded-lg border border-border px-3 py-2 text-xs">
          {details.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <AnimatePresence initial={false} mode="wait">
        {!decided ? (
          <motion.div
            key="actions"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            className="flex gap-2"
          >
            <Button type="button" size="sm" className="flex-1" onClick={onApprove}>
              {approveLabel}
            </Button>
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onDeny}>
              {denyLabel}
            </Button>
          </motion.div>
        ) : (
          <motion.p
            key="result"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "rounded-md px-3 py-2 text-center text-xs font-medium",
              status === "approved"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
            role="status"
          >
            {status === "approved"
              ? "You approved this tool call."
              : "You denied this tool call."}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}