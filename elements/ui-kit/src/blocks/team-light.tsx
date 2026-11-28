"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type TeamSectionMember = {
  name: string;
  role: string;
  bio?: string;
  initials?: string;
  avatar?: string;
};

export type TeamLightProps = {
  title?: string;
  description?: string;
  members?: TeamSectionMember[];
  className?: string;
};

const defaultMembers: TeamSectionMember[] = [
  {
    name: "Sam Alizadeh",
    role: "Design systems",
    bio: "Token architecture and visual language.",
  },
  {
    name: "Alex Kim",
    role: "Platform engineering",
    bio: "Tooling, releases, and registry ergonomics.",
  },
  {
    name: "Jordan Lee",
    role: "Product",
    bio: "Scope, prioritization, and customer feedback.",
  },
  {
    name: "Riley Park",
    role: "Developer relations",
    bio: "Education, community, and launch support.",
  },
];

function memberInitials(name: string, provided?: string) {
  if (provided) return provided.slice(0, 2).toUpperCase();
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Airy team section on a light muted surface. */
export function TeamLight({
  title = "Meet the team",
  description = "Friendly faces, clear roles — composed from the same primitives your product uses.",
  members = defaultMembers,
  className,
}: TeamLightProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.18 });
  const show = reduce || inView;

  return (
    <section
      ref={ref}
      data-slot="team-light"
      className={cn(
        "rounded-3xl border border-border/60 bg-muted/40 px-6 py-14 sm:px-12",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl space-y-12">
        <motion.header
          className="max-w-xl"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.45 }}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
        </motion.header>

        <ul className="grid gap-8 sm:grid-cols-2">
          {members.map((member, i) => (
            <motion.li
              key={member.name}
              className="flex gap-5 rounded-2xl bg-card/80 p-6 shadow-sm"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: reduce ? 0 : 0.08 + i * 0.06, duration: 0.4 }}
            >
              <Avatar className="size-16 shrink-0">
                {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
                <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                  {memberInitials(member.name, member.initials)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.role}</p>
                {member.bio ? (
                  <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
                ) : null}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}