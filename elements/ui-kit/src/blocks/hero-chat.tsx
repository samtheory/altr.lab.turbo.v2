"use client";

import * as React from "react";
import { motion } from "motion/react";

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type HeroChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: React.ReactNode;
};

export type HeroChatAction = {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

function ChatAction({ action, variant }: { action: HeroChatAction; variant: "default" | "outline" }) {
  if (action.href) {
    return (
      <Button variant={variant} asChild>
        <a href={action.href}>{action.label}</a>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export type HeroChatProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  messages?: HeroChatMessage[];
  primaryAction?: HeroChatAction;
  secondaryAction?: HeroChatAction;
  previewLabel?: string;
  className?: string;
};

const DEFAULT_MESSAGES: HeroChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Ship an agent UI with approvals and tool traces.",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Use ConversationShell for the thread, ToolApproval for human gates, and StreamingMessage for token output — all presentational.",
  },
  {
    id: "3",
    role: "user",
    content: "Does it respect reduced motion?",
  },
  {
    id: "4",
    role: "assistant",
    content: "Yes. Loops freeze and show their end state when prefers-reduced-motion is on.",
  },
];

/** Marketing hero with a mini conversation preview and CTA actions. */
export function HeroChat({
  title = "Agent interfaces that feel native",
  description = "Preview how your product talks — then wire the same blocks to your runtime.",
  messages = DEFAULT_MESSAGES,
  primaryAction = { label: "Open conversation kit" },
  secondaryAction = { label: "See HITL patterns" },
  previewLabel = "Live preview",
  className,
}: HeroChatProps) {
  const reduce = useReducedMotion();

  return (
    <section
      data-slot="hero-chat"
      className={cn("relative mx-auto max-w-5xl px-6 py-16", className)}
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="text-center lg:text-left">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            {primaryAction ? <ChatAction action={primaryAction} variant="default" /> : null}
            {secondaryAction ? <ChatAction action={secondaryAction} variant="outline" /> : null}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-1 shadow-[0_24px_48px_-28px_oklch(0_0_0/0.45)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {previewLabel}
              </span>
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-muted-foreground/40" />
              </span>
            </div>
            <ul className="flex max-h-[min(340px,50vh)] flex-col gap-3 overflow-y-auto p-4">
              {messages.map((msg, i) => (
                <motion.li
                  key={msg.id}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : i * 0.08 }}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <motion.div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-background text-foreground",
                    )}
                  >
                    {msg.content}
                  </motion.div>
                </motion.li>
              ))}
            </ul>
          </div>
          <div
            className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,oklch(from_var(--primary)_l_c_h_/_0.12),transparent_65%)]"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}