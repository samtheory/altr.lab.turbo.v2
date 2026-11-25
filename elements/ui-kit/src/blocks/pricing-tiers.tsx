"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type PricingPeriod = "monthly" | "annual";

export type PricingPlan = {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: string;
  annualPrice: string;
  features: string[];
  featured?: boolean;
};

export type PricingTiersProps = {
  plans?: PricingPlan[];
  featuredId?: string;
  defaultPeriod?: PricingPeriod;
  onSelect?: (planId: string, period: PricingPeriod) => void;
  className?: string;
};

const defaultPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For side projects",
    monthlyPrice: "$0",
    annualPrice: "$0",
    features: ["1 workspace", "Community support", "Basic blocks"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams",
    monthlyPrice: "$29",
    annualPrice: "$24",
    features: ["Unlimited projects", "Motion presets", "Priority support"],
    featured: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For platform teams",
    monthlyPrice: "$99",
    annualPrice: "$79",
    features: ["SSO", "Audit logs", "Dedicated success"],
  },
];

/** Three-plan pricing with monthly/annual toggle and featured highlight. */
export function PricingTiers({
  plans = defaultPlans,
  featuredId,
  defaultPeriod = "monthly",
  onSelect,
  className,
}: PricingTiersProps) {
  const reduce = useReducedMotion();
  const [period, setPeriod] = React.useState<PricingPeriod>(defaultPeriod);

  const featured =
    featuredId ?? plans.find((p) => p.featured)?.id ?? plans[1]?.id;

  return (
    <section data-slot="pricing-tiers" className={cn("space-y-8", className)}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Simple pricing
          </h2>
          <p className="text-sm text-muted-foreground">
            Switch billing anytime — annual saves ~20%.
          </p>
        </div>
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex rounded-full border border-border bg-muted p-0.5"
        >
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                period === p
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const isFeatured = plan.id === featured;
          const price =
            period === "monthly" ? plan.monthlyPrice : plan.annualPrice;

          return (
            <motion.li
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                isFeatured
                  ? "border-primary/50 shadow-[0_16px_40px_-24px_var(--primary-glow)]"
                  : "border-border",
              )}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
            >
              {isFeatured ? (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {plan.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              ) : null}
              <p className="mt-4 font-display text-3xl font-bold tabular-nums tracking-tight">
                {price}
                <span className="text-sm font-medium text-muted-foreground">
                  /{period === "monthly" ? "mo" : "yr"}
                </span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant={isFeatured ? "default" : "outline"}
                className="mt-6 w-full"
                onClick={() => onSelect?.(plan.id, period)}
              >
                Choose {plan.name}
              </Button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}