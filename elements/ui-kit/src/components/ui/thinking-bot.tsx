"use client";

import * as React from "react";
import { Bot } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ThinkingBotProps = {
  label?: string;
  className?: string;
};

/** Bot avatar with bouncing dots. */
export function ThinkingBot({ label = "Working on it…", className }: ThinkingBotProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      data-slot="thinking-bot"
      className={cn("flex items-center gap-3", className)}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background">
        <Bot className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <span className="mt-1 flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground"
              animate={reduce ? { opacity: 0.5 } : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }
              }
            />
          ))}
        </span>
      </div>
    </div>
  );
}
