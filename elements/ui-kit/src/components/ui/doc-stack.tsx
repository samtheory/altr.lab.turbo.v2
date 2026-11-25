"use client";

import * as React from "react";
import { AtSign, FileText, Globe, type LucideIcon } from "lucide-react";
import { motion, useInView, type Variants } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type DocStackProfile = {
  name: string;
  role: string;
  bio: string;
  initials: string;
  tone: string;
  links: { icon: LucideIcon; label: string }[];
};

const DEFAULT_PROFILES: DocStackProfile[] = [
  {
    name: "Kenzo Ito",
    role: "Creative Director",
    bio: "Shares files with the team and lets the doc answer the questions.",
    initials: "KI",
    tone: "from-muted-foreground to-foreground",
    links: [
      { icon: Globe, label: "kenzo.studio" },
      { icon: AtSign, label: "@kenzo.ito" },
    ],
  },
  {
    name: "Alex McDonald",
    role: "Product Designer",
    bio: "Drops in a brief, gets the summary and open questions back.",
    initials: "AM",
    tone: "from-muted to-muted-foreground",
    links: [
      { icon: Globe, label: "alexmcd.design" },
      { icon: AtSign, label: "@alex.mcd" },
    ],
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 260, damping: 22 };

const sheet = (depth: 1 | 2): Variants => ({
  hidden: { y: 0, scale: 1 - depth * 0.04, rotate: 0, opacity: 0 },
  show: {
    y: -8 * depth,
    scale: 1 - depth * 0.04,
    rotate: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: EASE, delay: 0.25 + (2 - depth) * 0.08 },
  },
  hover: {
    y: -14 * depth - 2,
    scale: 1 - depth * 0.035,
    rotate: depth === 1 ? 1.8 : -2.4,
    opacity: 1,
    transition: SPRING,
  },
});

const front: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
  hover: { y: 2, opacity: 1, transition: SPRING },
};

const iconV: Variants = {
  hidden: { scale: 0.4, rotate: -20, opacity: 0 },
  show: { scale: 1, rotate: 0, opacity: 1, transition: { ...SPRING, delay: 0.35 } },
  hover: {
    scale: 1.06,
    rotate: [0, -10, 8, 0],
    opacity: 1,
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

const text = (i: number): Variants => ({
  hidden: { y: 10, opacity: 0, filter: "blur(4px)" },
  show: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE, delay: 0.45 + i * 0.08 },
  },
  hover: { y: 0, opacity: 1, filter: "blur(0px)" },
});

const POSES = [
  { x: 0, y: 14, rotate: -9 },
  { x: 0, y: -6, rotate: -9 },
];

const profile = (i: number): Variants => ({
  hidden: { x: 120, y: POSES[i]!.y + 30, rotate: 6, opacity: 0 },
  show: { ...POSES[i]!, opacity: 1, transition: { ...SPRING, delay: 0.55 + i * 0.12 } },
  hover: { ...POSES[i]!, opacity: 1 },
});

const STILL: Variants = { hidden: {}, show: {}, hover: {} };

function ProfileCard({ p }: { p: DocStackProfile }) {
  return (
    <div className="w-44 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-md">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[10px] font-semibold text-primary-foreground",
            p.tone,
          )}
        >
          {p.initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-tight">{p.name}</p>
          <span className="mt-0.5 inline-block rounded-full bg-muted px-1.5 py-px text-[8px] text-muted-foreground">
            {p.role}
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-[8.5px] leading-snug text-muted-foreground">{p.bio}</p>
      <ul className="mt-2 space-y-1">
        {p.links.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-1.5 rounded-md border border-border px-1.5 py-1 text-[8.5px]"
          >
            <Icon className="size-2.5 text-muted-foreground" aria-hidden />
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type DocStackProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  profiles?: DocStackProfile[];
  onClick?: () => void;
  className?: string;
};

/** Stacked document card with paper sheets and fan-in profiles. */
export function DocStack({
  title = "Shared report",
  description = "Share your files and analyze",
  icon: Icon = FileText,
  profiles = DEFAULT_PROFILES,
  onClick,
  className,
}: DocStackProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const state = !inView ? "hidden" : hovered ? "hover" : "show";
  const v = (variants: Variants) => (reduce ? STILL : variants);

  return (
    <motion.div
      ref={ref}
      data-slot="doc-stack"
      initial={reduce ? false : "hidden"}
      animate={state}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={onClick}
      tabIndex={0}
      className={cn("relative mx-auto w-full max-w-sm pt-5 outline-none", className)}
    >
      {([2, 1] as const).map((d) => (
        <motion.div
          key={d}
          variants={v(sheet(d))}
          aria-hidden
          className="absolute inset-x-0 top-5 h-48 origin-top rounded-2xl border border-border bg-card/70 shadow-md backdrop-blur-sm"
        />
      ))}

      <motion.article
        variants={v(front)}
        className="relative h-48 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute top-6 right-6 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_12%,transparent),transparent_65%)] blur-xl"
        />

        <div className="relative flex h-full flex-col justify-between p-5">
          <motion.span
            variants={v(iconV)}
            className="grid size-11 place-items-center rounded-full bg-foreground text-background shadow-md"
          >
            <Icon className="size-5" strokeWidth={2.25} aria-hidden />
          </motion.span>
          <div className="max-w-[55%]">
            <motion.h3
              variants={v(text(0))}
              className="text-lg font-semibold leading-tight tracking-tight"
            >
              {title}
            </motion.h3>
            <motion.p variants={v(text(1))} className="mt-1 text-sm text-muted-foreground">
              {description}
            </motion.p>
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/2">
          {profiles[0] ? (
            <motion.div variants={v(profile(0))} className="absolute top-12 -left-2">
              <ProfileCard p={profiles[0]} />
            </motion.div>
          ) : null}
          {profiles[1] ? (
            <motion.div variants={v(profile(1))} className="absolute top-4 left-14">
              <ProfileCard p={profiles[1]} />
            </motion.div>
          ) : null}
        </div>
      </motion.article>
    </motion.div>
  );
}
