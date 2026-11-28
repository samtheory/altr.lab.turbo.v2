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

export type TeamAvatarsProps = {
  title?: string;
  members?: TeamSectionMember[];
  /** When true, lays out avatars in a single centered row. */
  compact?: boolean;
  className?: string;
};

const defaultMembers: TeamSectionMember[] = [
  { name: "Sam Alizadeh", role: "Design systems" },
  { name: "Alex Kim", role: "Platform engineering" },
  { name: "Jordan Lee", role: "Product" },
  { name: "Riley Park", role: "Developer relations" },
  { name: "Casey Ng", role: "Quality" },
  { name: "Morgan Hayes", role: "Research" },
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

/** Compact row or grid of small avatars with names. */
export function TeamAvatars({
  title = "The people behind the kit",
  members = defaultMembers,
  compact = false,
  className,
}: TeamAvatarsProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const show = reduce || inView;

  return (
    <section
      ref={ref}
      data-slot="team-avatars"
      className={cn("mx-auto w-full max-w-4xl space-y-6 px-4 text-center", className)}
    >
      <motion.h2
        className="font-display text-2xl font-semibold tracking-tight"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.35 }}
      >
        {title}
      </motion.h2>

      <ul
        className={cn(
          "flex flex-wrap justify-center gap-6",
          !compact && "sm:grid sm:grid-cols-3 sm:justify-items-center sm:gap-8",
        )}
      >
        {members.map((member, i) => (
          <motion.li
            key={member.name}
            className="flex w-24 flex-col items-center gap-2"
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
            transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.35 }}
          >
            <Avatar className="size-12 ring-2 ring-border ring-offset-2 ring-offset-background">
              {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
              <AvatarFallback className="text-xs font-medium text-muted-foreground">
                {memberInitials(member.name, member.initials)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium leading-tight text-foreground">{member.name}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{member.role}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}