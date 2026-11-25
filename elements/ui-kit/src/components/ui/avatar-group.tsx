"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

export type AvatarGroupItem = {
  initials: string;
  src?: string;
  name?: string;
};

const LIFT = -4;
const FALLOFF = 0.45;
const SCALE = 1.05;
const EASE_IN = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_OUT = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export type AvatarGroupProps = {
  people?: AvatarGroupItem[];
  /** Label on the last, highlighted avatar; pass `null` to hide it. */
  moreLabel?: string | null;
  caption?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "size-7",
  md: "size-9",
  lg: "size-11",
} as const;

/** Overlapping avatars that lift in a wave around the one you hover. */
export function AvatarGroup({
  people = [
    { initials: "AN" },
    { initials: "BT" },
    { initials: "CL" },
    { initials: "DH" },
    { initials: "EV" },
  ],
  moreLabel = "+12",
  caption,
  size = "md",
  className,
}: AvatarGroupProps) {
  const [active, setActive] = React.useState<number | null>(null);
  const items: AvatarGroupItem[] = moreLabel ? [...people, { initials: moreLabel }] : people;

  return (
    <div data-slot="avatar-group" className={cn("flex items-center gap-3", className)}>
      <div className="flex -space-x-2" onMouseLeave={() => setActive(null)}>
        {items.map((person, i) => {
          const shift = active === null ? 0 : LIFT * Math.pow(FALLOFF, Math.abs(i - active));
          const more = Boolean(moreLabel) && i === items.length - 1;
          return (
            <div
              key={`${person.initials}-${i}`}
              onMouseEnter={() => setActive(i)}
              className="transition-transform duration-[320ms] will-change-transform motion-reduce:transform-none! motion-reduce:transition-none"
              style={{
                transform: `translateY(${shift.toFixed(3)}px) scale(${active === i ? SCALE : 1})`,
                transitionTimingFunction: active === null ? EASE_OUT : EASE_IN,
                zIndex: active === i ? 20 : items.length - i,
              }}
            >
              <Avatar className={cn(sizeClass[size], "ring-2 ring-background")}>
                {person.src ? (
                  <AvatarImage src={person.src} alt={person.name ?? person.initials} />
                ) : null}
                <AvatarFallback
                  className={
                    more
                      ? "bg-primary text-xs font-medium text-primary-foreground"
                      : "bg-secondary text-xs font-medium"
                  }
                >
                  {person.initials}
                </AvatarFallback>
              </Avatar>
            </div>
          );
        })}
      </div>
      {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
