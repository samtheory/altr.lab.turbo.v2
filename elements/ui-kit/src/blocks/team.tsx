"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type TeamMember = {
  name: string;
  role: string;
  initials?: string;
};

export type TeamBlockProps = {
  title?: string;
  members?: TeamMember[];
  className?: string;
};

const defaultMembers: TeamMember[] = [
  { name: "Sam Alizadeh", role: "Design systems" },
  { name: "Alex Kim", role: "Platform engineering" },
  { name: "Jordan Lee", role: "Product" },
  { name: "Riley Park", role: "Developer relations" },
];

function initialsFor(name: string, provided?: string) {
  if (provided) return provided.slice(0, 2).toUpperCase();
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Grid of team members for marketing pages. */
export function TeamBlock({
  title = "Built by builders",
  members = defaultMembers,
  className,
}: TeamBlockProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      data-slot="team-block"
      className={cn("space-y-6", className)}
    >
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member, i) => (
          <motion.li
            key={member.name}
            className="rounded-2xl border border-border bg-card/50 p-5 shadow-sm"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 grid size-12 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {initialsFor(member.name, member.initials)}
            </div>
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.role}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}