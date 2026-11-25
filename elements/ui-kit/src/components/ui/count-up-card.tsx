"use client";

import * as React from "react";
import {
  Clock3,
  Flame,
  FolderKanban,
  ListChecks,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useAnimationFrame } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type CountUpMetric = {
  value: string;
  label: string;
  icon: LucideIcon;
  colors: string;
};

const DEFAULT_ROWS: CountUpMetric[] = [
  { value: "6.5 hrs", label: "Deep work", icon: Clock3, colors: "from-info to-primary" },
  { value: "24", label: "Tasks done", icon: ListChecks, colors: "from-warning to-destructive" },
  { value: "12 days", label: "Daily streak", icon: Flame, colors: "from-destructive to-warning" },
  { value: "+3", label: "Projects shipped", icon: FolderKanban, colors: "from-success to-info" },
  { value: "92%", label: "Focus score", icon: Target, colors: "from-primary to-info" },
];

const H = 112;
const GAP = 14;
const VIEW = 480;
const COMPACT = 0.72;
const FADE = "linear-gradient(to bottom, transparent, #000 16%, #000 76%, transparent)";
const SPD = 52;

function pose(index: number, offset: number, k: number, n: number) {
  const step = (H + GAP) * k;
  const loop = n * step;
  const focus = VIEW * k * 0.52;
  const top = ((((index * step - offset) % loop) + loop) % loop) - step;
  const dist = Math.min(Math.abs(top + (H * k) / 2 - focus) / ((VIEW * k) / 2), 1);
  const scale = 1 - 0.38 * dist ** 1.4;
  const opacity = 1 - 0.85 * dist ** 3;
  return { transform: `translateY(${top}px) scale(${scale})`, opacity };
}

export type CountUpCardProps = {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: string;
  metrics?: CountUpMetric[];
  className?: string;
};

/** Weekly metrics conveyor — pills swell at the focus line and fade at the edges. */
export function CountUpCard({
  eyebrow = "This week",
  title = (
    <>
      Small steps.
      <br />
      Real momentum.
    </>
  ),
  description = "Make space for focused work, finish what matters, and see your progress add up.",
  metrics = DEFAULT_ROWS,
  className,
}: CountUpCardProps) {
  const reduce = useReducedMotion();
  const refs = React.useRef<(HTMLLIElement | null)[]>([]);
  const card = React.useRef<HTMLElement>(null);
  const [k, setK] = React.useState(1);
  const kRef = React.useRef(1);
  const n = metrics.length;

  React.useEffect(() => {
    const el = card.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      kRef.current = (entry?.contentRect.width ?? 448) < 448 ? COMPACT : 1;
      setK(kRef.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const move = (offset: number) => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      const { transform, opacity } = pose(i, offset, kRef.current, n);
      el.style.transform = transform;
      el.style.opacity = String(opacity);
    });
  };

  useAnimationFrame((time) => {
    if (!reduce) move((time / 1000) * SPD * kRef.current);
  });

  return (
    <div className="@container w-full" data-slot="count-up-card">
      <article
        ref={card}
        className={cn(
          "mx-auto grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-lg @md:grid-cols-[1fr_0.92fr]",
          className,
        )}
      >
        <div className="self-center p-6 pb-2 @md:p-8">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {eyebrow}
          </span>
          <h2 className="mt-5 max-w-sm text-2xl font-semibold leading-[1.05] tracking-tight @md:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 hidden max-w-sm text-sm leading-relaxed text-muted-foreground @md:block">
              {description}
            </p>
          ) : null}
        </div>

        <ul
          aria-label="Progress metrics"
          className="relative mx-auto w-[calc(100%-3rem)] max-w-[340px] overflow-hidden @md:mr-6 @md:ml-0"
          style={{ height: VIEW * k, maskImage: FADE, WebkitMaskImage: FADE }}
        >
          {metrics.map((row, i) => {
            const Icon = row.icon;
            return (
              <li
                key={row.label}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={cn(
                  "absolute inset-x-0 top-0 flex w-full items-center gap-2 rounded-full bg-gradient-to-r p-2 pr-4 text-primary-foreground shadow-lg will-change-transform",
                  row.colors,
                )}
                style={{ height: H * k, ...pose(i, 0, k, n) }}
              >
                <span className="grid aspect-square h-full shrink-0 place-items-center rounded-full bg-background text-foreground">
                  <Icon aria-hidden className="size-9" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xl font-semibold leading-tight tabular-nums">
                    {row.value}
                  </span>
                  <span className="block truncate text-xs font-medium text-primary-foreground/85">
                    {row.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </article>
    </div>
  );
}
