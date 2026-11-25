"use client";

import * as React from "react";
import { motion } from "motion/react";

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type CreativeHomeHeroAction = {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

function CreativeAction({
  action,
  variant,
}: {
  action: CreativeHomeHeroAction;
  variant: "default" | "outline";
}) {
  if (action.href) {
    return (
      <Button variant={variant} size="lg" asChild>
        <a href={action.href}>{action.label}</a>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} size="lg" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export type CreativeHomeHeroProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  primaryAction?: CreativeHomeHeroAction;
  secondaryAction?: CreativeHomeHeroAction;
  /** CSS-only floating accent shapes behind the headline. */
  accents?: boolean;
  className?: string;
};

/** Bold creative landing hero with display typography and optional floating accent shapes. */
export function CreativeHomeHero({
  title = "Design systems with teeth",
  subtitle = "Apolyx blocks compose like product UI — not like a template graveyard.",
  primaryAction = { label: "Start building" },
  secondaryAction = { label: "Browse registry" },
  accents = true,
  className,
}: CreativeHomeHeroProps) {
  const reduce = useReducedMotion();

  return (
    <section
      data-slot="creative-home-hero"
      className={cn(
        "relative isolate overflow-hidden px-6 py-20 sm:py-28",
        className,
      )}
    >
      {accents ? <FloatingAccents reduce={reduce ?? false} /> : null}

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <p className="mb-4 text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Apolyx
        </p>
        <h1 className="text-balance font-semibold tracking-[-0.04em] text-foreground text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.95]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? <CreativeAction action={primaryAction} variant="default" /> : null}
          {secondaryAction ? (
            <CreativeAction action={secondaryAction} variant="outline" />
          ) : null}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
        aria-hidden
      />
    </section>
  );
}

function FloatingAccents({ reduce }: { reduce: boolean }) {
  return (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <motion.span
      className="absolute -left-8 top-[18%] size-32 rounded-[2rem] border border-border bg-card/60 shadow-sm sm:size-40"
      animate={reduce ? undefined : { y: [0, -14, 0], rotate: [0, 6, 0] }}
      transition={
        reduce
          ? undefined
          : { duration: 9, repeat: Infinity, ease: "easeInOut" }
      }
    />
    <motion.span
      className="absolute right-[8%] top-[12%] size-20 rounded-full border border-primary/25 bg-primary/10 sm:size-24"
      animate={reduce ? undefined : { y: [0, 12, 0], x: [0, -8, 0] }}
      transition={
        reduce
          ? undefined
          : { duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
      }
    />
    <span className="absolute left-1/2 top-[42%] size-px -translate-x-1/2" />
    <motion.span
      className="absolute left-[14%] bottom-[22%] hidden size-16 rotate-12 rounded-xl border border-border bg-muted/50 sm:block"
      animate={reduce ? undefined : { rotate: [12, 20, 12] }}
      transition={
        reduce
          ? undefined
          : { duration: 11, repeat: Infinity, ease: "easeInOut" }
      }
    />
    <motion.span
      className="absolute -right-4 bottom-[28%] size-28 rounded-full border border-border bg-gradient-to-br from-card to-muted/40 sm:size-36"
      style={{
        backgroundImage:
          "repeating-linear-gradient(-12deg, transparent, transparent 8px, oklch(from var(--border) l c h / 0.35) 8px, oklch(from var(--border) l c h / 0.35) 9px)",
      }}
      animate={reduce ? undefined : { y: [0, -10, 0] }}
      transition={
        reduce
          ? undefined
          : { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
      }
    />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(from_var(--foreground)_l_c_h_/_0.06),transparent)]" />
  </div>
  );
}