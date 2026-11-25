"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type DiffLine = {
  type: "context" | "add" | "remove";
  text: string;
  oldNo?: number;
  newNo?: number;
};

export type DiffViewerProps = {
  title?: string;
  lines?: DiffLine[];
  className?: string;
};

const DEMO: DiffLine[] = [
  { type: "context", text: "export function greet(name: string) {", oldNo: 1, newNo: 1 },
  { type: "remove", text: '  return "Hi " + name;', oldNo: 2 },
  { type: "add", text: "  return `Hello, ${name}!`;", newNo: 2 },
  { type: "context", text: "}", oldNo: 3, newNo: 3 },
];

/** Unified diff panel for agent file edits. */
export function DiffViewer({
  title = "greet.ts",
  lines = DEMO,
  className,
}: DiffViewerProps) {
  return (
    <div
      data-slot="diff-viewer"
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <div className="border-b border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
        {title}
      </div>
      <pre className="overflow-x-auto py-1 font-mono text-[12px] leading-relaxed [scrollbar-width:thin]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[2.5rem_2.5rem_1.25rem_1fr] gap-0 px-0",
              line.type === "add" && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
              line.type === "remove" && "bg-red-500/10 text-red-800 dark:text-red-200",
            )}
          >
            <span className="select-none px-2 text-right text-muted-foreground/70 tabular-nums">
              {line.oldNo ?? ""}
            </span>
            <span className="select-none px-2 text-right text-muted-foreground/70 tabular-nums">
              {line.newNo ?? ""}
            </span>
            <span className="select-none text-center" aria-hidden>
              {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
            </span>
            <span className="pr-3 whitespace-pre">{line.text}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
