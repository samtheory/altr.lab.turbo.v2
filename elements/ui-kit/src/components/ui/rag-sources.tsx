"use client";

import * as React from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";

export type RagChunk = {
  id: string;
  title: string;
  score?: number;
  excerpt?: string;
  collection?: string;
};

export type RagSourcesProps = {
  title?: string;
  chunks?: RagChunk[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO: RagChunk[] = [
  {
    id: "1",
    title: "Composer contracts",
    score: 0.92,
    collection: "ui-kit",
    excerpt: "Pickers emit callbacks only; apps own transport and AI SDK wiring.",
  },
  {
    id: "2",
    title: "Reduced motion",
    score: 0.87,
    collection: "ui-kit",
    excerpt: "Freeze demo loops and show the end state when prefers-reduced-motion.",
  },
  {
    id: "3",
    title: "Semantic tokens",
    score: 0.81,
    collection: "apolyx",
    excerpt: "No hard-coded brand hex — use foreground, muted, destructive.",
  },
];

/** Retrieved RAG chunks with scores, collapsible. */
export function RagSources({
  title = "Retrieved",
  chunks = DEMO,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  autoPlay = false,
  className,
}: RagSourcesProps) {
  const bodyId = useId();
  const reduce = useReducedMotion();
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const open = openProp ?? innerOpen;

  return (
    <div
      data-slot="rag-sources"
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          if (openProp === undefined) setInnerOpen(!open);
          onOpenChange?.(!open);
        }}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BookOpen className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium">{title}</span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {chunks.length}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 text-muted-foreground transition-transform duration-300",
            !open && "-rotate-90",
          )}
          aria-hidden
        />
      </button>
      <div
        id={bodyId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 border-t border-border p-2">
            {chunks.map((c, i) => (
              <motion.li
                key={c.id}
                initial={autoPlay && !reduce ? { opacity: 0, x: -4 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: autoPlay && !reduce ? i * 0.07 : 0, duration: 0.25 }}
                className="rounded-lg px-2.5 py-2 hover:bg-muted/60"
              >
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{c.title}</span>
                  {c.score !== undefined && (
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {(c.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {c.collection && (
                  <p className="mt-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                    {c.collection}
                  </p>
                )}
                {c.excerpt && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {c.excerpt}
                  </p>
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
