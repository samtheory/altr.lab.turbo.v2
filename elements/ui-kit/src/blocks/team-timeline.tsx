"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "../components/ui/timeline";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type TeamSectionMember = {
  name: string;
  role: string;
  bio?: string;
  initials?: string;
  avatar?: string;
};

export type TeamTimelineProps = {
  title?: string;
  description?: string;
  members?: TeamSectionMember[];
  className?: string;
};

const defaultMembers: TeamSectionMember[] = [
  {
    name: "Sam Alizadeh",
    role: "Design systems",
    bio: "Founded the token pipeline and block registry.",
  },
  {
    name: "Alex Kim",
    role: "Platform engineering",
    bio: "Owns CI, packaging, and install paths.",
  },
  {
    name: "Jordan Lee",
    role: "Product",
    bio: "Defines the roadmap for marketing and app surfaces.",
  },
  {
    name: "Riley Park",
    role: "Developer relations",
    bio: "Ships docs and example pages for every wave.",
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

/** Team members as vertical timeline cards. */
export function TeamTimeline({
  title = "How we grew",
  description = "From a token experiment to a full block library — each milestone added someone who cares about craft.",
  members = defaultMembers,
  className,
}: TeamTimelineProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const show = reduce || inView;
  const progress = members.length;

  return (
    <section
      ref={ref}
      data-slot="team-timeline"
      className={cn("mx-auto w-full max-w-2xl space-y-8 px-4", className)}
    >
      <motion.header
        className="text-center"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 text-muted-foreground text-pretty">{description}</p>
      </motion.header>

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={show ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: reduce ? 0 : 0.1, duration: 0.45 }}
      >
        <Timeline value={progress} tone="primary" size="md" aria-label="Team timeline">
          {members.map((member, index) => (
            <TimelineItem key={member.name} step={index + 1}>
              <TimelineSeparator />
              <TimelineIndicator />
              <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar className="size-11">
                    {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                      {memberInitials(member.name, member.initials)}
                    </AvatarFallback>
                  </Avatar>
                  <TimelineHeader className="min-w-0 flex-1">
                    <TimelineTitle className="text-base">{member.name}</TimelineTitle>
                    <TimelineContent className="mt-0 text-xs font-medium uppercase tracking-wide">
                      {member.role}
                    </TimelineContent>
                  </TimelineHeader>
                </div>
                {member.bio ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
                ) : null}
              </article>
            </TimelineItem>
          ))}
        </Timeline>
      </motion.div>
    </section>
  );
}