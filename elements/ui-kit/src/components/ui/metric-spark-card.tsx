"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type MetricSparkCardProps = {
  label?: string;
  value?: string;
  delta?: string;
  positive?: boolean;
  points?: number[];
  className?: string;
};

/** Metric tile with an animated SVG sparkline. */
export function MetricSparkCard({
  label = "Revenue",
  value = "$48.2k",
  delta = "+12.4%",
  positive = true,
  points = [12, 18, 14, 22, 20, 28, 26, 34, 30, 38, 36, 44],
  className,
}: MetricSparkCardProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const w = 160;
  const h = 48;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * w;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const d = `M ${coords.join(" L ")}`;
  const area = `${d} L ${w},${h} L 0,${h} Z`;

  return (
    <Card
      ref={ref}
      data-slot="metric-spark-card"
      className={cn("w-full max-w-xs overflow-hidden", className)}
    >
      <CardHeader className="pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <CardTitle className="flex items-baseline gap-2 text-2xl tabular-nums">
          {value}
          <span
            className={cn(
              "text-sm font-semibold",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {delta}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full overflow-visible" aria-hidden>
          <motion.path
            d={area}
            fill="var(--primary)"
            fillOpacity={0.12}
            initial={false}
            animate={{ opacity: inView || reduce ? 1 : 0 }}
          />
          <motion.path
            d={d}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: inView || reduce ? 1 : 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      </CardContent>
    </Card>
  );
}
