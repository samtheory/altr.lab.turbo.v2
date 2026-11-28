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

export type TeamScalesProps = {
  title?: string;
  members?: TeamSectionMember[];
  className?: string;
};

const defaultMembers: TeamSectionMember[] = [
  { name: "Sam Alizadeh", role: "Design systems", bio: "Leads the kit and design language." },
  { name: "Alex Kim", role: "Platform engineering", bio: "Build systems and distribution." },
  { name: "Jordan Lee", role: "Product", bio: "Roadmap and adoption." },
  { name: "Riley Park", role: "Developer relations", bio: "Docs, demos, and outreach." },
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

/** Team cards that scale on hover; motion disabled under reduced-motion. */
export function TeamScales({
  title = "People who ship",
  members = defaultMembers,
  className,
}: TeamScalesProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const show = reduce || inView;

  return (
    <section
      ref={ref}
      data-slot="team-scales"
      className={cn("mx-auto w-full max-w-5xl space-y-8 px-4", className)}
    >
      <motion.h2
        className="text-center font-display text-3xl font-semibold tracking-tight"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.4 }}
      >
        {title}
      </motion.h2>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member, i) => (
          <motion.li
            key={member.name}
            className="origin-center"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ delay: reduce ? 0 : i * 0.06, duration: 0.42 }}
            whileHover={
              reduce
                ? undefined
                : {
                    scale: 1.05,
                    boxShadow:
                      "0 20px 40px -24px color-mix(in oklch, var(--foreground) 25%, transparent)",
                  }
            }
          >
            <article className="h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30">
              <Avatar className="mb-5 size-14">
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
            </article>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}