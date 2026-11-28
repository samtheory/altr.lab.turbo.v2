"use client";

import * as React from "react";

import { TypewriterText } from "../components/ui/typewriter-text";
import { cn } from "../lib/utils";

export type TextTypewriterBlockProps = {
  typed?: string;
  subtitle?: string;
  body?: string;
  speed?: number;
  className?: string;
};

const defaultTyped = "Type once. Ship everywhere.";
const defaultSubtitle = "Apolyx blocks";
const defaultBody =
  "Let the hero line type in character by character, then follow with static supporting copy.";

/** Section with a typewriter hero line and optional subtitle. */
export function TextTypewriterBlock({
  typed = defaultTyped,
  subtitle = defaultSubtitle,
  body = defaultBody,
  speed = 32,
  className,
}: TextTypewriterBlockProps) {
  return (
    <section
      data-slot="text-typewriter-block"
      className={cn(
        "mx-auto w-full max-w-3xl px-4 py-16 text-center sm:py-24",
        className,
      )}
    >
      {subtitle ? (
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {subtitle}
        </p>
      ) : null}

      <h2 className="mt-3 min-h-[1.2em] font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
        <TypewriterText text={typed} speed={speed} />
      </h2>

      {body ? (
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {body}
        </p>
      ) : null}
    </section>
  );
}