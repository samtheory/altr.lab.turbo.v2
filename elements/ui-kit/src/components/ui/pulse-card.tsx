"use client";

import * as React from "react";
import { Heart, Plus } from "lucide-react";
import { animate, motion, useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";

export type PulseCardProps = {
  bpm?: number;
  recordedAt?: string;
  weeklyAverage?: number;
  monthlyAverage?: number;
  className?: string;
};

const ECG_PATH =
  "M0 25H27l5-3 5 5 5-3h12l5-17 6 35 6-22 5 7 6-2h17l6-5 5-10 6 15 5-8 6 8h19l5-3 5 3h13l6-18 6 7 6 19 6-8h21l5-3 5 4h14l5-4 5-11 6 11 5-4 6 7h14l5-2 6 2h12";

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  React.useEffect(() => {
    const node = ref.current;
    if (node && !reduce && !inView) node.textContent = `0${suffix}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    if (reduce) {
      node.textContent = `${value}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

/** Heart-rate style pulse summary with animated ECG trace. */
export function PulseCard({
  bpm = 81,
  recordedAt = "TODAY 08:20AM",
  weeklyAverage = 86,
  monthlyAverage = 77,
  className,
}: PulseCardProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const gradientId = `pulse-${uid}`;

  return (
    <article
      data-slot="pulse-card"
      className={cn(
        "mx-auto flex h-[380px] w-full max-w-[360px] flex-col overflow-hidden rounded-xl border border-border bg-card font-sans text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-1 flex-col px-10 pt-9 pb-6">
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-[30px] font-normal leading-none tracking-tight">Heart rate</h2>
            <p className="mt-2 font-mono text-[13px] tracking-wide text-muted-foreground">
              {recordedAt}
            </p>
          </div>
          <span className="relative mt-0.5 inline-flex size-8 items-center justify-center" aria-hidden>
            <Heart className="size-8 stroke-[1.7]" />
            <Plus className="absolute top-[9px] right-[5px] size-3 stroke-[2.5] text-destructive" />
          </span>
        </header>

        <div className="mt-7 flex items-baseline gap-3">
          <span className="text-[74px] font-light leading-none tabular-nums">
            <Counter value={bpm} />
          </span>
          <span className="font-mono text-[17px] text-muted-foreground">BPM</span>
        </div>

        <div
          className="mx-auto mt-auto w-full max-w-[240px] pt-4"
          role="img"
          aria-label="Heartbeat waveform"
        >
          <svg
            viewBox="0 0 300 48"
            className="h-6 w-full overflow-visible"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`${gradientId}-trace`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop stopColor="var(--muted-foreground)" stopOpacity="0" />
                <stop offset="0.31" stopColor="var(--muted-foreground)" stopOpacity="0.9" />
                <stop offset="0.47" stopColor="var(--destructive)" stopOpacity="0.9" />
                <stop offset="0.83" stopColor="var(--muted-foreground)" stopOpacity="0.7" />
                <stop offset="1" stopColor="var(--muted-foreground)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${gradientId}-glow`}>
                <stop stopColor="var(--destructive)" stopOpacity="0.2" />
                <stop offset="0.5" stopColor="var(--background)" />
                <stop offset="1" stopColor="var(--destructive)" stopOpacity="0.2" />
              </linearGradient>
              <filter id={`${gradientId}-blur`} x="-30%" y="-100%" width="160%" height="300%">
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
            </defs>
            <path
              d={ECG_PATH}
              stroke={`url(#${gradientId}-trace)`}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <motion.path
              d={ECG_PATH}
              pathLength={1}
              stroke={`url(#${gradientId}-glow)`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0.13 0.87"
              filter={`url(#${gradientId}-blur)`}
              initial={{ strokeDashoffset: 1 }}
              animate={{ strokeDashoffset: reduceMotion ? 1 : 0 }}
              transition={{ duration: 4, ease: "linear", repeat: Infinity }}
            />
            <motion.path
              d={ECG_PATH}
              pathLength={1}
              stroke={`url(#${gradientId}-glow)`}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0.13 0.87"
              initial={{ strokeDashoffset: 1 }}
              animate={{ strokeDashoffset: reduceMotion ? 1 : 0 }}
              transition={{ duration: 4, ease: "linear", repeat: Infinity }}
            />
          </svg>
        </div>
      </div>

      <footer className="grid grid-cols-2 border-t border-border px-10 pt-5 pb-7">
        <div>
          <p className="font-mono text-[13px] tracking-wide text-muted-foreground">WEEKLY</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[43px] font-light leading-none tabular-nums">
              <Counter value={weeklyAverage} />
            </span>
            <span className="font-mono text-[15px] text-muted-foreground">BPM</span>
          </p>
        </div>
        <div>
          <p className="font-mono text-[13px] tracking-wide text-muted-foreground">MONTHLY</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[43px] font-light leading-none tabular-nums">
              <Counter value={monthlyAverage} />
            </span>
            <span className="font-mono text-[15px] text-muted-foreground">BPM</span>
          </p>
        </div>
      </footer>
    </article>
  );
}
