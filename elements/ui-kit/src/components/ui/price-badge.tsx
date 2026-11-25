"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";

import { cn } from "../../lib/utils";

const priceBadgeVariants = cva(
  "inline-flex h-7 items-center gap-0 overflow-hidden rounded-full border px-3 text-sm font-semibold tabular-nums",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-background text-foreground",
        success: "border-transparent bg-success text-success-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const HOLD = 1800;
const STAGGER = 0.035;
const spring = { type: "spring" as const, stiffness: 520, damping: 24, mass: 0.7 };
const layoutSpring = { type: "spring" as const, stiffness: 420, damping: 40 };

type Glyph = { key: string; char: string };

/**
 * Prices are keyed around the decimal so cents swap with cents.
 * A dropped leading digit leaves from the front. Words key left-to-right.
 */
function glyphs(value: string): Glyph[] {
  const m = /^(\D*)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!m) return [...value].map((char, i) => ({ key: `t${i}`, char }));
  const [, prefix, int, frac] = m;
  return [
    ...[...prefix].map((char, i) => ({ key: `p${i}`, char })),
    ...[...int].map((char, i) => ({ key: `i${int.length - 1 - i}`, char })),
    ...(frac
      ? [{ key: "dot", char: "." }, ...[...frac].map((char, i) => ({ key: `f${i}`, char }))]
      : []),
  ];
}

function formatPrice(price: React.ReactNode, currency?: React.ReactNode) {
  if (typeof price === "string" || typeof price === "number") {
    const body = String(price);
    if (currency == null || currency === "") return body;
    if (typeof currency === "string" || typeof currency === "number") {
      return `${currency}${body}`;
    }
  }
  return null;
}

export type PriceBadgeProps = VariantProps<typeof priceBadgeVariants> & {
  /**
   * Single price shown with rolling glyphs when it changes.
   * Prefer a string/number (e.g. `"$29"` or with `currency`) so digits can animate.
   */
  price?: React.ReactNode;
  /** Controlled display value; when set, the badge does not cycle `values`. */
  value?: string;
  /** Values the badge cycles through while in view. */
  values?: string[];
  /** Milliseconds each cycled value stays up. */
  interval?: number;
  /** Struck-through compare-at (static; not glyph-rolled). */
  compareAt?: React.ReactNode;
  currency?: React.ReactNode;
  className?: string;
};

/** Pill badge whose price rolls glyph by glyph when the value changes. */
export function PriceBadge({
  price,
  value: valueProp,
  values,
  interval = HOLD,
  compareAt,
  currency,
  variant,
  className,
}: PriceBadgeProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  const cycleValues = values?.length ? values : undefined;
  const formatted = formatPrice(price, currency);
  const cycling = valueProp === undefined && formatted === null && (cycleValues?.length ?? 0) > 1;
  const display =
    valueProp ??
    formatted ??
    (cycleValues ? (cycleValues[index % cycleValues.length] ?? "") : null);

  React.useEffect(() => {
    if (!inView || reduce || !cycling || !cycleValues) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % cycleValues.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [inView, reduce, cycling, cycleValues, interval]);

  const canRoll = typeof display === "string" && display.length > 0;
  const list = canRoll ? glyphs(display) : [];

  return (
    <MotionConfig transition={spring} reducedMotion="user">
      <motion.span
        ref={ref}
        layout
        data-slot="price-badge"
        className={cn(priceBadgeVariants({ variant }), "gap-1.5", className)}
        style={{ borderRadius: 9999 }}
        transition={{ layout: layoutSpring }}
      >
        {canRoll ? (
          <>
            <span className="sr-only">{display}</span>
            <span aria-hidden className="flex">
              <AnimatePresence mode="popLayout" initial={false}>
                {list.map(({ key, char }, i) => (
                  <motion.span
                    key={key}
                    layout="position"
                    className="relative inline-flex"
                    initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.6 }}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={char}
                        className="inline-block"
                        variants={{
                          enter: { y: "0.55em", scale: 0.5, opacity: 0 },
                          center: { y: 0, scale: 1, opacity: 1 },
                          exit: { y: "0.55em", scale: 0.5, opacity: 0 },
                        }}
                        initial={reduce ? false : "enter"}
                        animate="center"
                        exit={reduce ? undefined : "exit"}
                        transition={{ ...spring, delay: reduce ? 0 : i * STAGGER }}
                      >
                        {char === " " ? "\u00a0" : char}
                      </motion.span>
                    </AnimatePresence>
                  </motion.span>
                ))}
              </AnimatePresence>
            </span>
          </>
        ) : (
          <>
            {currency ? <span className="text-[0.85em] opacity-80">{currency}</span> : null}
            <span>{price}</span>
          </>
        )}
        {compareAt ? (
          <span className="text-[0.85em] font-normal line-through opacity-70">{compareAt}</span>
        ) : null}
      </motion.span>
    </MotionConfig>
  );
}

export { priceBadgeVariants };
