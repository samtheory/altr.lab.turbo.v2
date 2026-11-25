"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ActivityNight = {
  label: string;
  name: string;
  hours: number;
  bedtime: string;
  wake: string;
};

export type ActivityBarsProps = {
  nights?: ActivityNight[];
  goal?: number;
  max?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  title?: string;
  className?: string;
};

const WEEK: ActivityNight[] = [
  { label: "Mon", name: "Monday", hours: 7.5, bedtime: "23:10", wake: "06:40" },
  { label: "Tue", name: "Tuesday", hours: 6.25, bedtime: "00:20", wake: "06:35" },
  { label: "Wed", name: "Wednesday", hours: 5.75, bedtime: "00:50", wake: "06:35" },
  { label: "Thu", name: "Thursday", hours: 8.25, bedtime: "22:40", wake: "06:55" },
  { label: "Fri", name: "Friday", hours: 6.5, bedtime: "01:15", wake: "07:45" },
  { label: "Sat", name: "Saturday", hours: 9.25, bedtime: "00:30", wake: "09:45" },
  { label: "Sun", name: "Sunday", hours: 8, bedtime: "23:00", wake: "07:00" },
];

const STACK = 128;
const GAP = 3;
const LABEL_ROW = 24;

function formatHours(hours: number) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${String(m).padStart(2, "0")}m` : `${h}h`;
}

/** Week of activity as segmented columns with a goal line. */
export function ActivityBars({
  nights = WEEK,
  goal = 8,
  max = 10,
  value,
  defaultValue = nights.length - 1,
  onValueChange,
  title = "Sleep",
  className,
}: ActivityBarsProps) {
  const reduceMotion = useReducedMotion();
  const [own, setOwn] = React.useState(defaultValue);
  const picked = value ?? own;
  const night = nights[picked]!;
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);

  const segments = Math.max(1, Math.round(max));
  const light = (STACK - GAP * (segments - 1)) / segments;
  const goalBottom = Math.min(goal / max, 1) * segments * (light + GAP) - GAP / 2;
  const average = nights.reduce((sum, n) => sum + n.hours, 0) / nights.length;
  const metGoal = nights.filter((n) => n.hours >= goal).length;
  const diff = night.hours - goal;

  function pick(index: number, focus = false) {
    if (value === undefined) setOwn(index);
    onValueChange?.(index);
    if (focus) buttons.current[index]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const last = nights.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? picked === last
          ? 0
          : picked + 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? picked === 0
            ? last
            : picked - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    pick(next, true);
  }

  return (
    <article
      data-slot="activity-bars"
      className={cn(
        "mx-auto flex w-full max-w-[360px] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <header className="flex items-start justify-between px-7 pt-7">
        <div>
          <h2 className="text-[26px] font-normal leading-none tracking-tight">{title}</h2>
          <p className="mt-2 font-mono text-[12px] tracking-wide text-muted-foreground uppercase">
            Last 7 nights · avg {formatHours(average)}
          </p>
        </div>
        <span
          className="inline-flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary"
          aria-hidden
        >
          <Activity className="size-[18px] stroke-[1.8]" />
        </span>
      </header>

      <div className="px-7 pt-6" aria-live="polite">
        <p className="text-[13px] text-muted-foreground">{night.name} night</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <span className="text-[44px] font-light leading-none tracking-tight tabular-nums">
            {formatHours(night.hours)}
          </span>
          <span
            className={cn(
              "mb-1 rounded-full px-2.5 py-1 font-mono text-[11px] tabular-nums",
              diff >= 0
                ? "bg-primary/15 text-primary"
                : "bg-warning/15 text-warning",
            )}
          >
            {diff === 0
              ? "On goal"
              : diff > 0
                ? `+${formatHours(diff)} over goal`
                : `${formatHours(-diff)} short`}
          </span>
        </div>
        <p className="mt-2 font-mono text-[12px] text-muted-foreground tabular-nums">
          {night.bedtime} → {night.wake}
        </p>
      </div>

      <div className="relative mt-6 px-7">
        <div
          role="radiogroup"
          aria-label="Hours by night"
          onKeyDown={onKeyDown}
          className="relative flex items-end gap-2"
        >
          {nights.map((n, col) => {
            const active = col === picked;
            const color = n.hours >= goal ? "var(--primary)" : "var(--warning)";
            const lit = Math.min(n.hours, max) / (max / segments);
            return (
              <motion.button
                key={n.label}
                ref={(node) => {
                  buttons.current[col] = node;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${n.name}: ${formatHours(n.hours)}`}
                tabIndex={active ? 0 : -1}
                onClick={() => pick(col)}
                initial={false}
                animate={{ flexGrow: active ? 1.6 : 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
                className="group flex min-w-0 basis-0 cursor-pointer flex-col items-stretch gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <span
                  className="flex flex-col-reverse"
                  style={{ height: STACK, gap: GAP }}
                  aria-hidden
                >
                  {Array.from({ length: segments }, (_, i) => {
                    const fill = Math.max(0, Math.min(1, lit - i));
                    const top = fill > 0 && lit - i <= 1;
                    return (
                      <span
                        key={i}
                        className="relative w-full overflow-hidden rounded-[3px] bg-foreground/5 transition-colors group-hover:bg-foreground/10"
                        style={{ height: light }}
                      >
                        {fill > 0 ? (
                          <motion.span
                            className="absolute inset-x-0 bottom-0 rounded-[3px]"
                            style={{
                              height: `${fill * 100}%`,
                              backgroundColor: color,
                              opacity: active ? 1 : 0.32,
                              transformOrigin: "bottom",
                              boxShadow: active && top ? `0 0 12px 2px ${color}` : undefined,
                            }}
                            initial={reduceMotion ? false : { scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{
                              duration: 0.25,
                              delay: col * 0.05 + i * 0.045,
                              ease: "easeOut",
                            }}
                          />
                        ) : null}
                      </span>
                    );
                  })}
                </span>
                <span
                  className={cn(
                    "h-4 text-center font-mono text-[11px] leading-4 transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {n.label}
                </span>
              </motion.button>
            );
          })}

          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/35"
            style={{ bottom: goalBottom + LABEL_ROW }}
            aria-hidden
          />
        </div>
      </div>

      <footer className="mt-6 flex items-center justify-between border-t border-border px-7 py-4 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-foreground/50" /> {goal}h goal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Goal met · {metGoal}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" /> Short · {nights.length - metGoal}
        </span>
      </footer>
    </article>
  );
}
