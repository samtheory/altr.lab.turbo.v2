"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { BlurFade } from "../motion/blur-fade";

export type TextBlurFadeBlockProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  /** Extra delay between stacked BlurFade lines (ms). */
  stagger?: number;
  className?: string;
};

const defaultTitle = "Ideas that land with clarity";
const defaultBody =
  "Staggered blur-fade reveals draw attention to your headline and supporting copy without reinventing motion recipes.";

/** Marketing section with headline and body revealed via staggered BlurFade. */
export function TextBlurFadeBlock({
  eyebrow = "Text animation",
  title = defaultTitle,
  body = defaultBody,
  stagger = 120,
  className,
}: TextBlurFadeBlockProps) {
  const titleDelay = eyebrow ? stagger : 0;
  const bodyDelay = eyebrow ? stagger * 2 : stagger;

  return (
    <section
      data-slot="text-blur-fade-block"
      className={cn(
        "mx-auto w-full max-w-3xl px-4 py-16 text-center sm:py-24",
        className,
      )}
    >
      {eyebrow ? (
        <BlurFade
          as="p"
          delay={0}
          className="text-sm font-medium uppercase tracking-widest text-primary"
        >
          {eyebrow}
        </BlurFade>
      ) : null}

      <BlurFade
        as="h2"
        delay={titleDelay}
        className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl"
      >
        {title}
      </BlurFade>

      {body ? (
        <BlurFade
          as="p"
          delay={bodyDelay}
          blur={6}
          offset={10}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
        >
          {body}
        </BlurFade>
      ) : null}
    </section>
  );
}