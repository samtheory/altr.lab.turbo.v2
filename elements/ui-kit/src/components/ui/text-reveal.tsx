"use client";

import * as React from "react";
import { useInView } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TextRevealProps = {
  text: string;
  by?: "word" | "char";
  /** ms between pieces */
  stagger?: number;
  /** ms before first piece */
  delay?: number;
  /** ms each piece takes */
  duration?: number;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  once?: boolean;
  className?: string;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Words or letters fade in from a soft blur and rise into place. */
export function TextReveal({
  text,
  by = "word",
  stagger = 40,
  delay = 0,
  duration = 700,
  as: Tag = "p",
  once = true,
  className,
}: TextRevealProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once, amount: 0.3 });
  const shown = reduce || inView;

  let index = 0;
  const piece = (content: string, key: string) => {
    const i = index++;
    return (
      <span
        key={key}
        className={cn(
          "inline-block",
          shown ? "translate-y-0 opacity-100 blur-none" : "translate-y-[0.35em] opacity-0 blur-[6px]",
        )}
        style={{
          transitionProperty: "opacity, transform, filter",
          transitionTimingFunction: EASE,
          transitionDuration: reduce ? "0ms" : `${duration}ms`,
          transitionDelay: shown && !reduce ? `${delay + i * stagger}ms` : "0ms",
        }}
      >
        {content}
      </span>
    );
  };

  const words = text.split(/\s+/).filter(Boolean);
  const pieces = words.flatMap((word, w) => [
    by === "char" ? (
      <span key={`w${w}`} className="inline-block whitespace-nowrap">
        {Array.from(word).map((char, c) => piece(char, `w${w}c${c}`))}
      </span>
    ) : (
      piece(word, `w${w}`)
    ),
    w < words.length - 1 ? " " : null,
  ]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(className)}
      data-slot="text-reveal"
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>{pieces}</span>
    </Tag>
  );
}
