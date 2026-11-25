"use client";

import * as React from "react";
import { Command, FilePlus, Search, Sparkles, Wrench } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SlashCommand = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: "sparkles" | "search" | "tool" | "file" | "command";
};

export type SlashMenuProps = {
  commands?: SlashCommand[];
  open?: boolean;
  defaultOpen?: boolean;
  query?: string;
  onSelect?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO: SlashCommand[] = [
  {
    id: "summarize",
    label: "Summarize",
    description: "Condense the thread",
    shortcut: "/sum",
    icon: "sparkles",
  },
  {
    id: "search",
    label: "Search docs",
    description: "Query the knowledge base",
    shortcut: "/search",
    icon: "search",
  },
  {
    id: "tool",
    label: "Run tool",
    description: "Invoke an approved tool",
    shortcut: "/tool",
    icon: "tool",
  },
  {
    id: "draft",
    label: "New draft",
    description: "Start a blank reply",
    shortcut: "/draft",
    icon: "file",
  },
];

const ICONS = {
  sparkles: Sparkles,
  search: Search,
  tool: Wrench,
  file: FilePlus,
  command: Command,
};

/** Slash-command palette for a chat composer. */
export function SlashMenu({
  commands = DEMO,
  open: openProp,
  defaultOpen = true,
  query = "",
  onSelect,
  onOpenChange,
  autoPlay = false,
  className,
}: SlashMenuProps) {
  const reduce = useReducedMotion();
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const [active, setActive] = React.useState(0);
  const open = openProp ?? innerOpen;

  const filtered = commands.filter((c) => {
    const q = query.toLowerCase().replace(/^\//, "");
    if (!q) return true;
    return (
      c.label.toLowerCase().includes(q) ||
      c.shortcut?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  React.useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % Math.max(filtered.length, 1));
    }, 1100);
    return () => clearInterval(id);
  }, [autoPlay, filtered.length]);

  function setOpen(next: boolean) {
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-slot="slash-menu"
          role="listbox"
          aria-label="Commands"
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "w-80 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            className,
          )}
        >
          <p className="px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Commands
          </p>
          {filtered.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">No commands</p>
          ) : (
            filtered.map((c, i) => {
              const Icon = ICONS[c.icon ?? "command"];
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onClick={() => {
                    onSelect?.(c.id);
                    setOpen(false);
                  }}
                  onPointerMove={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none",
                    i === active && "bg-muted",
                  )}
                >
                  <span className="grid size-7 place-items-center rounded-md border border-border bg-background text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{c.label}</span>
                    {c.description && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {c.description}
                      </span>
                    )}
                  </span>
                  {c.shortcut && (
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {c.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
