"use client";

import * as React from "react";
import { AlertTriangle, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type StagedActionDetail = {
  label: string;
  value: string;
};

export type StagedActionProps = {
  title?: string;
  description?: string;
  details?: StagedActionDetail[];
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_DETAILS: StagedActionDetail[] = [
  { label: "Environment", value: "production" },
  { label: "Mutation", value: "update_invoice_status" },
  { label: "Records", value: "1 invoice · 3 line items" },
];

/** Preview card for a staged side-effect before the agent runs it. */
export function StagedAction({
  title = "Staged action",
  description = "Review what will run when you confirm.",
  details: detailsProp,
  onConfirm,
  onCancel,
  confirmLabel = "Run action",
  cancelLabel = "Cancel",
  autoPlay = false,
  className,
}: StagedActionProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const details = detailsProp ?? (autoPlay ? DEMO_DETAILS : []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  const shimmer = autoPlay && visible && !reduce;

  return (
    <div
      ref={ref}
      data-slot="staged-action"
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-warning/10 text-warning",
            shimmer && "apolyx-tool-shimmer",
          )}
          aria-hidden
        >
          <AlertTriangle className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {details.length > 0 ? (
        <dl className="mb-3 space-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
          {details.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <AnimatePresence initial={false}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          <Button type="button" size="sm" className="flex-1 gap-1.5" onClick={onConfirm}>
            <Play className="size-3.5" aria-hidden />
            {confirmLabel}
          </Button>
          <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}