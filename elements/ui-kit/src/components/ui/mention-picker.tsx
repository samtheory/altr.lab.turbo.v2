"use client";

import * as React from "react";
import { AtSign, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";

export type MentionOption = {
  id: string;
  label: string;
  description?: string;
  handle?: string;
};

export type MentionPickerProps = {
  options?: MentionOption[];
  open?: boolean;
  defaultOpen?: boolean;
  query?: string;
  onSelect?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO: MentionOption[] = [
  { id: "1", label: "Sam Alizadeh", handle: "@sam", description: "Owner" },
  { id: "2", label: "Apollo", handle: "@apollo", description: "UI kit agent" },
  { id: "3", label: "Docs man", handle: "@docs", description: "Vault steward" },
];

/** @-mention list for a chat composer. */
export function MentionPicker({
  options = DEMO,
  open: openProp,
  defaultOpen = true,
  query = "",
  onSelect,
  onOpenChange,
  autoPlay = false,
  className,
}: MentionPickerProps) {
  const listId = useId();
  const reduce = useReducedMotion();
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const [active, setActive] = React.useState(0);
  const open = openProp ?? innerOpen;

  const filtered = options.filter((o) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      o.label.toLowerCase().includes(q) ||
      o.handle?.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q)
    );
  });

  React.useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % Math.max(filtered.length, 1));
    }, 1200);
    return () => clearInterval(id);
  }, [autoPlay, filtered.length]);

  function setOpen(next: boolean) {
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  function pick(id: string) {
    onSelect?.(id);
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-slot="mention-picker"
          role="listbox"
          id={listId}
          aria-label="Mentions"
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "w-72 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            className,
          )}
        >
          <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            <AtSign className="size-3" aria-hidden />
            People
          </p>
          {filtered.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">No matches</p>
          ) : (
            filtered.map((o, i) => (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onClick={() => pick(o.id)}
                onPointerMove={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none",
                  i === active && "bg-muted",
                )}
              >
                <span className="grid size-7 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">
                  {o.label.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{o.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {o.handle}
                    {o.description ? ` · ${o.description}` : ""}
                  </span>
                </span>
                {i === active && <Check className="size-3.5 shrink-0" aria-hidden />}
              </button>
            ))
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
