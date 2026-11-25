"use client";

import * as React from "react";
import { ChevronDown, FileText, Link2, Package } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";

export type ArtifactItem = {
  id: string;
  name: string;
  kind?: "file" | "link";
  href?: string;
  meta?: string;
};

export type ArtifactPanelProps = {
  title?: string;
  artifacts?: ArtifactItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO: ArtifactItem[] = [
  { id: "1", name: "refund-draft.md", kind: "file", meta: "2.4 KB" },
  { id: "2", name: "invoice-4821.pdf", kind: "file", meta: "128 KB" },
  { id: "3", name: "Policy link", kind: "link", href: "#", meta: "billing.example.com" },
];

/** Collapsible panel listing generated artifacts (files and links). */
export function ArtifactPanel({
  title = "Artifacts",
  artifacts: artifactsProp,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  autoPlay = false,
  className,
}: ArtifactPanelProps) {
  const panelId = useId();
  const reduce = useReducedMotion();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const artifacts = artifactsProp ?? (autoPlay ? DEMO : []);

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div
      data-slot="artifact-panel"
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-left"
        aria-expanded={open}
        aria-controls={`${panelId}-list`}
        onClick={() => setOpen(!open)}
      >
        <Package className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-1 text-xs text-muted-foreground">({artifacts.length})</span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            id={`${panelId}-list`}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            className="divide-y divide-border"
          >
            {artifacts.map((item) => (
              <li key={item.id}>
                {item.kind === "link" && item.href ? (
                  <a
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <Link2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{item.name}</span>
                    {item.meta ? (
                      <span className="ml-auto text-[11px] text-muted-foreground">{item.meta}</span>
                    ) : null}
                  </a>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm">
                    <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{item.name}</span>
                    {item.meta ? (
                      <span className="ml-auto text-[11px] text-muted-foreground">{item.meta}</span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}