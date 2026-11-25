"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TypewriterTextProps = {
  text: string;
  className?: string;
  speed?: number;
  cursor?: boolean;
};

export function TypewriterText({
  text,
  className,
  speed = 28,
  cursor = true,
}: TypewriterTextProps) {
  const reduce = useReducedMotion();
  const [len, setLen] = React.useState(reduce ? text.length : 0);

  React.useEffect(() => {
    if (reduce) {
      setLen(text.length);
      return;
    }
    setLen(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setLen(i);
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed, reduce]);

  return (
    <span data-slot="typewriter-text" className={cn("inline", className)}>
      <span aria-live="polite">
        {text.slice(0, len)}
        {cursor && len < text.length ? (
          <span className="ml-0.5 inline-block w-0.5 animate-pulse bg-current" aria-hidden />
        ) : null}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}