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

export type TeamAboutCardsProps = {
  title?: string;
  description?: string;
  members?: TeamSectionMember[];
  className?: string;
};

const defaultMembers: TeamSectionMember[] = [
  {
    name: "Sam Alizadeh",
    role: "Design systems",
    bio: "Shapes tokens, motion, and the kit developers reach for first.",
  },
  {
    name: "Alex Kim",
    role: "Platform engineering",
    bio: "Keeps builds fast and registry installs predictable.",
  },
  {
    name: "Jordan Lee",
    role: "Product",
    bio: "Turns research into blocks that ship on marketing pages.",
  },
  {
    name: "Riley Park",
    role: "Developer relations",
    bio: "Docs, demos, and the glue between design and implementation.",
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

/** About copy with a grid of team member cards. */
export function TeamAboutCards({
  title = "About us",
  description = "We are a small crew building composable UI for product teams — semantic tokens, motion that respects preferences, and blocks you can drop into any page.",
  members = defaultMembers,
  className,
}: TeamAboutCardsProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const show = reduce || inView;

  return (
    <section
      ref={ref}
      data-slot="team-about-cards"
      className={cn("mx-auto w-full max-w-6xl space-y-10 px-4", className)}
    >
      <motion.header
        className="mx-auto max-w-2xl text-center"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </motion.header>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member, i) => (
          <motion.li
            key={member.name}
            className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{
              delay: reduce ? 0 : i * 0.07,
              duration: 0.42,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Avatar className="mb-4 size-14">
              {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
              <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                {memberInitials(member.name, member.initials)}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-foreground">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.role}</p>
            {member.bio ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
            ) : null}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}