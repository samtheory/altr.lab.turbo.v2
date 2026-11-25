"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { easings } from "../motion/tokens";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type HeroPillWord = {
  label: string;
  /** Semantic token name (`primary`, `success`, …) or any CSS color value. */
  color: string;
};

export type HeroPillBadge = {
  initials?: string;
  src?: string;
  alt?: string;
  className?: string;
};

export type HeroPillAction = {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

const TOKEN_PILL: Record<string, string> = {
  primary: "border-primary/30 bg-primary/12 text-primary",
  foreground: "border-border bg-foreground/8 text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  success: "border-success/35 bg-success/12 text-success",
  warning: "border-warning/35 bg-warning/15 text-warning-foreground",
  info: "border-info/35 bg-info/12 text-info",
  destructive: "border-destructive/35 bg-destructive/12 text-destructive",
};

function pillStyle(color: string): React.CSSProperties | undefined {
  if (TOKEN_PILL[color]) return undefined;
  return {
    color,
    borderColor: `color-mix(in oklch, ${color} 35%, transparent)`,
    backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
  };
}

function HeroAction({
  action,
  variant,
}: {
  action: HeroPillAction;
  variant: "default" | "outline";
}) {
  if (action.href) {
    return (
      <Button variant={variant} asChild>
        <a href={action.href}>{action.label}</a>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

const BADGE_ORBITS = [
  { x: "-4.5rem", y: "-3rem", delay: 0 },
  { x: "4.75rem", y: "-2.25rem", delay: 0.35 },
  { x: "-5.25rem", y: "2.5rem", delay: 0.7 },
  { x: "5rem", y: "2.75rem", delay: 1.05 },
  { x: "0rem", y: "-4.25rem", delay: 0.55 },
  { x: "-1rem", y: "4rem", delay: 0.9 },
] as const;

export type HeroPillProps = {
  badges?: HeroPillBadge[];
  headline?: React.ReactNode;
  words?: HeroPillWord[];
  wordInterval?: number;
  title?: React.ReactNode;
  titleSuffix?: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: HeroPillAction;
  secondaryAction?: HeroPillAction;
  footnote?: React.ReactNode;
  className?: string;
};

/** Centered marketing hero with orbiting avatar badges and a cycling color-pill headline word. */
export function HeroPill({
  badges = [],
  headline = "Ship products built for",
  words = [
    { label: "teams", color: "primary" },
    { label: "creators", color: "success" },
    { label: "operators", color: "info" },
  ],
  wordInterval = 2800,
  title = "Composable UI blocks",
  titleSuffix,
  description = "Installable Apolyx sections — presentational, token-driven, ready for your stack.",
  primaryAction = { label: "Browse blocks" },
  secondaryAction = { label: "View on GitHub" },
  footnote,
  className,
}: HeroPillProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (reduce || words.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, wordInterval);
    return () => window.clearInterval(id);
  }, [reduce, wordInterval, words.length]);

  const pill = words[reduce ? 0 : index] ?? words[0];

  return (
    <section
      data-slot="hero-pill"
      className={cn(
        "relative mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="relative mb-8 flex min-h-[5.5rem] w-full items-center justify-center">
        {badges.map((badge, i) => {
          const orbit = BADGE_ORBITS[i % BADGE_ORBITS.length]!;
          return (
            <motion.span
              key={i}
              className="absolute z-10"
              style={{ left: "50%", top: "50%", marginLeft: orbit.x, marginTop: orbit.y }}
              animate={
                reduce
                  ? { y: 0 }
                  : { y: [0, -6, 0, 5, 0] }
              }
              transition={
                reduce
                  ? undefined
                  : {
                      duration: 4.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: orbit.delay,
                    }
              }
            >
              <span className="flex size-11 items-center justify-center rounded-full border border-border bg-card shadow-[0_8px_24px_-12px_oklch(0_0_0/0.35)] ring-4 ring-background">
                <Avatar className={cn("size-9", badge.className)}>
                  {badge.src ? <AvatarImage src={badge.src} alt={badge.alt ?? ""} /> : null}
                  <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                    {badge.initials ?? "•"}
                  </AvatarFallback>
                </Avatar>
              </span>
            </motion.span>
          );
        })}

        <p className="relative z-20 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-balance text-lg text-muted-foreground sm:text-xl">
          <span>{headline}</span>
          <span className="inline-flex min-w-[7.5rem] justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={pill?.label ?? "pill"}
                initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: reduce ? 0 : 0.35, ease: easings.out }}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-medium tracking-tight",
                  pill ? TOKEN_PILL[pill.color] : TOKEN_PILL.primary,
                )}
                style={pill ? pillStyle(pill.color) : undefined}
              >
                {pill?.label}
              </motion.span>
            </AnimatePresence>
          </span>
        </p>
      </div>

      <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {title}
        {titleSuffix ? (
          <span className="mt-1 block text-muted-foreground sm:inline sm:mt-0 sm:ml-2 sm:font-normal">
            {titleSuffix}
          </span>
        ) : null}
      </h1>

      {description ? (
        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {primaryAction ? <HeroAction action={primaryAction} variant="default" /> : null}
        {secondaryAction ? <HeroAction action={secondaryAction} variant="outline" /> : null}
      </div>

      {footnote ? (
        <p className="mt-6 text-xs text-muted-foreground">{footnote}</p>
      ) : null}
    </section>
  );
}