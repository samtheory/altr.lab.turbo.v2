"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { Card } from "./card";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ReceiptLine = { label: string; amount: string };

export type ReceiptCardProps = {
  title?: string;
  merchant?: string;
  lines?: ReceiptLine[];
  total?: string;
  stamp?: string;
  className?: string;
};

const DEFAULT_LINES: ReceiptLine[] = [
  { label: "Design system pass", amount: "$420.00" },
  { label: "Motion polish", amount: "$180.00" },
  { label: "Docs & registry", amount: "$95.00" },
];

/** Service receipt that prints line-by-line when in view. */
export function ReceiptCard({
  title = "Service receipt",
  merchant = "Apolyx Studio",
  lines = DEFAULT_LINES,
  total = "$695.00",
  stamp = "PAID",
  className,
}: ReceiptCardProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const show = reduce || inView;

  return (
    <Card
      ref={ref}
      data-slot="receipt-card"
      className={cn(
        "relative w-full max-w-xs overflow-hidden border-dashed bg-card font-mono",
        className,
      )}
    >
      <div className="border-b border-dashed border-border px-5 py-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {merchant}
        </p>
        <h3 className="mt-1 text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <ul className="space-y-2 px-5 py-4 text-sm">
        {lines.map((line, i) => (
          <motion.li
            key={line.label}
            className="flex items-baseline justify-between gap-3"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.35, delay: reduce ? 0 : 0.12 + i * 0.1 }}
          >
            <span className="text-muted-foreground">{line.label}</span>
            <span className="tabular-nums">{line.amount}</span>
          </motion.li>
        ))}
      </ul>
      <motion.div
        className="relative z-[1] flex items-center justify-between border-t border-dashed border-border px-5 py-4 pb-6 text-sm font-semibold"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ delay: reduce ? 0 : 0.45 }}
      >
        <span>Total</span>
        <span className="tabular-nums">{total}</span>
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[38%] right-5 z-0 rotate-[-14deg] rounded border-2 border-success/90 bg-success/5 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.2em] text-success shadow-sm"
        initial={reduce ? false : { opacity: 0, scale: 1.35 }}
        animate={show ? { opacity: 0.92, scale: 1 } : { opacity: 0, scale: 1.35 }}
        transition={{ delay: reduce ? 0 : 0.7, type: "spring", stiffness: 260, damping: 18 }}
      >
        {stamp}
      </motion.div>
    </Card>
  );
}
