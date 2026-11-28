"use client";

import * as React from "react";

import { WordCycle } from "../components/ui/word-cycle";
import { cn } from "../lib/utils";

export type TextFlipBlockProps = {
  prefix?: string;
  words?: string[];
  suffix?: string;
  body?: string;
  className?: string;
};

const defaultWords = ["faster", "clearer", "bolder", "sharper"];

const defaultBody =
  "Cycle highlighted words in the headline to emphasize outcomes—powered by WordCycle and semantic tokens.";

/** Section headline with a cycling word in the title. */
export function TextFlipBlock({
  prefix = "Ship",
  words = defaultWords,
  suffix = "products",
  body = defaultBody,
  className,
}: TextFlipBlockProps) {
  return (
    <section
      data-slot="text-flip-block"
      className={cn(
        "mx-auto w-full max-w-3xl px-4 py-16 text-center sm:py-24",
        className,
      )}
    >
      <h2 className="font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
        <span>{prefix}</span>{" "}
        <WordCycle
          words={words}
          className="text-primary"
          interval={2600}
        />
        {suffix ? (
          <>
            {" "}
            <span>{suffix}</span>
          </>
        ) : null}
      </h2>

      {body ? (
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {body}
        </p>
      ) : null}
    </section>
  );
}