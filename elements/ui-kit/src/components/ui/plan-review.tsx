"use client";

import * as React from "react";
import { ListChecks, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type PlanStep = {
  id: string;
  label: string;
  detail?: string;
};

export type PlanReviewProps = {
  title?: string;
  steps?: PlanStep[];
  onApprove?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_STEPS: PlanStep[] = [
  { id: "1", label: "Load customer account", detail: "Read-only CRM lookup" },
  { id: "2", label: "Draft refund proposal", detail: "Max $120 per policy" },
  { id: "3", label: "Request your approval", detail: "Before Stripe mutation" },
];

/** Review card for an agent execution plan with approve / edit / reject actions. */
export function PlanReview({
  title = "Proposed plan",
  steps: stepsProp,
  onApprove,
  onEdit,
  onReject,
  autoPlay = false,
  className,
}: PlanReviewProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const steps = stepsProp ?? DEMO_STEPS;
  const LOOP = 4000;
  const TICK = 50;

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
  }, [autoPlay, visible, reduce]);

  const activeStep =
    autoPlay && !reduce ? Math.floor(((tick % LOOP) / LOOP) * steps.length) : -1;

  return (
    <div
      ref={ref}
      data-slot="plan-review"
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <ol className="mb-4 space-y-2">
        {steps.map((step, i) => (
          <motion.li
            key={step.id}
            className={cn(
              "rounded-lg border border-border px-3 py-2 text-sm",
              activeStep === i && "border-primary/40 bg-primary/5",
            )}
          >
            <span className="font-medium">
              {i + 1}. {step.label}
            </span>
            {step.detail ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
            ) : null}
          </motion.li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="flex-1 gap-1.5" onClick={onApprove}>
          <ThumbsUp className="size-3.5" aria-hidden />
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onReject}>
          <ThumbsDown className="size-3.5" aria-hidden />
          Reject
        </Button>
      </div>
    </div>
  );
}