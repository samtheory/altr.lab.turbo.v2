"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type DiffLine = {
  type: "context" | "add" | "remove";
  text: string;
  oldNo?: number;
  newNo?: number;
};

export type DiffViewerMode = "unified" | "split";

export type DiffViewerProps = {
  title?: string;
  lines?: DiffLine[];
  mode?: DiffViewerMode;
  className?: string;
};

const DEMO: DiffLine[] = [
  { type: "context", text: "export function greet(name: string) {", oldNo: 1, newNo: 1 },
  { type: "remove", text: '  return "Hi " + name;', oldNo: 2 },
  { type: "add", text: "  return `Hello, ${name}!`;", newNo: 2 },
  { type: "context", text: "}", oldNo: 3, newNo: 3 },
];

function lineTone(type: DiffLine["type"]) {
  if (type === "add") return "bg-success/10 text-success";
  if (type === "remove") return "bg-destructive/10 text-destructive";
  return "";
}

function UnifiedRows({ lines }: { lines: DiffLine[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "grid grid-cols-[2.5rem_2.5rem_1.25rem_1fr] gap-0 px-0",
            lineTone(line.type),
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
    </>
  );
}

function SideRows({
  lines,
  side,
}: {
  lines: DiffLine[];
  side: "old" | "new";
}) {
  return (
    <>
      {lines.map((line, i) => {
        const hidden =
          (side === "old" && line.type === "add") || (side === "new" && line.type === "remove");
        if (hidden) {
          return (
            <div
              key={i}
              className="grid grid-cols-[2.5rem_1.25rem_1fr] bg-muted/20 text-muted-foreground/40"
              aria-hidden
            >
              <span className="select-none px-2 py-0.5 text-right tabular-nums">&nbsp;</span>
              <span className="select-none text-center">&nbsp;</span>
              <span className="pr-3">&nbsp;</span>
            </div>
          );
        }
        const no = side === "old" ? line.oldNo : line.newNo;
        return (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[2.5rem_1.25rem_1fr] gap-0",
              lineTone(line.type),
            )}
          >
            <span className="select-none px-2 text-right text-muted-foreground/70 tabular-nums">
              {no ?? ""}
            </span>
            <span className="select-none text-center" aria-hidden>
              {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
            </span>
            <span className="pr-3 whitespace-pre">{line.text}</span>
          </div>
        );
      })}
    </>
  );
}

/** Unified or side-by-side diff panel for agent file edits. */
export function DiffViewer({
  title = "greet.ts",
  lines = DEMO,
  mode = "unified",
  className,
}: DiffViewerProps) {
  return (
    <div
      data-slot="diff-viewer"
      className={cn(
        "w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <div className="border-b border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
        {title}
      </div>
      {mode === "split" ? (
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="min-w-0">
            <p className="border-b border-border/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Original
            </p>
            <pre className="overflow-x-auto py-1 font-mono text-[12px] leading-relaxed [scrollbar-width:thin]">
              <SideRows lines={lines} side="old" />
            </pre>
          </div>
          <div className="min-w-0">
            <p className="border-b border-border/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Modified
            </p>
            <pre className="overflow-x-auto py-1 font-mono text-[12px] leading-relaxed [scrollbar-width:thin]">
              <SideRows lines={lines} side="new" />
            </pre>
          </div>
        </div>
      ) : (
        <pre className="overflow-x-auto py-1 font-mono text-[12px] leading-relaxed [scrollbar-width:thin]">
          <UnifiedRows lines={lines} />
        </pre>
      )}
    </div>
  );
}