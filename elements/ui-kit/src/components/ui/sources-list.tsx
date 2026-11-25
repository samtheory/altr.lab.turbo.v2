"use client";

import * as React from "react";
import { ExternalLink, FileText } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SourceItem = {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
};

export type SourcesListProps = {
  title?: string;
  sources?: SourceItem[];
  autoPlay?: boolean;
  className?: string;
};

const DEMO: SourceItem[] = [
  {
    id: "1",
    title: "Agent UX patterns",
    url: "https://apolyx.dev/docs",
    snippet: "Keep tool cards readable and approvals explicit.",
  },
  {
    id: "2",
    title: "Streaming without layout shift",
    url: "https://apolyx.dev/components",
    snippet: "Hold code-block frames while tokens arrive.",
  },
  {
    id: "3",
    title: "Citation chrome",
    url: "https://apolyx.dev/blocks",
    snippet: "Surface sources next to the answer, not buried.",
  },
];

/** Cited sources under an assistant reply. */
export function SourcesList({
  title = "Sources",
  sources = DEMO,
  autoPlay = false,
  className,
}: SourcesListProps) {
  const reduce = useReducedMotion();

  return (
    <div
      data-slot="sources-list"
      className={cn("w-full max-w-lg space-y-2 text-foreground", className)}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="space-y-1.5">
        {sources.map((s, i) => (
          <motion.li
            key={s.id}
            initial={autoPlay && !reduce ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: autoPlay && !reduce ? i * 0.08 : 0 }}
          >
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <FileText className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{s.title}</span>
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                </span>
                {s.snippet && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {s.snippet}
                  </span>
                )}
              </span>
            </a>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
