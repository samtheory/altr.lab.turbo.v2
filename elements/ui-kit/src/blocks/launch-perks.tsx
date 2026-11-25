"use client";

import * as React from "react";
import { Gift } from "lucide-react";
import { motion, useInView } from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type LaunchPerk = {
  title: string;
  detail?: string;
};

export type LaunchPerksProps = {
  title?: string;
  perks?: LaunchPerk[];
  layout?: "grid" | "list";
  className?: string;
};

const defaultPerks: LaunchPerk[] = [
  { title: "Founding pricing", detail: "Lock annual rate for life" },
  { title: "Priority onboarding", detail: "1:1 kit walkthrough" },
  { title: "Private Slack", detail: "Ship with the core team" },
  { title: "Bonus motion pack", detail: "HITL + voice presets" },
];

/** Launch offer perk chips for marketing sections. */
export function LaunchPerks({
  title = "Launch perks",
  perks = defaultPerks,
  layout = "grid",
  className,
}: LaunchPerksProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  return (
    <section ref={ref} data-slot="launch-perks" className={cn("space-y-4", className)}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
        <Gift className="size-5 text-primary" aria-hidden />
        {title}
      </h2>
      <ul
        className={cn(
          layout === "grid"
            ? "grid gap-3 sm:grid-cols-2"
            : "flex flex-col gap-2",
        )}
      >
        {perks.map((perk, i) => (
          <motion.li
            key={perk.title}
            className="rounded-2xl border border-border bg-card/50 px-4 py-3 shadow-sm"
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={reduce || inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
          >
            <p className="text-sm font-semibold">{perk.title}</p>
            {perk.detail ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{perk.detail}</p>
            ) : null}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}