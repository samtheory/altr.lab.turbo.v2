"use client";

import * as React from "react";
import { Brain, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";
import { Button } from "./button";

export type AgentMemoryEntry = {
  id: string;
  fact: string;
  scope?: string;
};

export type AgentMemoryProps = {
  title?: string;
  entries?: AgentMemoryEntry[];
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_ENTRIES: AgentMemoryEntry[] = [
  { id: "1", fact: "User prefers concise bullet answers.", scope: "session" },
  { id: "2", fact: "Workspace timezone is Asia/Tehran.", scope: "org" },
  { id: "3", fact: "Refund policy allows 30-day window.", scope: "knowledge" },
];

const STEP = 900;
const TICK = 50;
const HOLD = 3200;

/** Expandable drawer of facts the agent remembers. */
export function AgentMemory({
  title = "Agent memory",
  entries: entriesProp,
  onAdd,
  onRemove,
  onEdit,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  autoPlay = false,
  className,
}: AgentMemoryProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const open = openProp ?? innerOpen;
  const base = entriesProp ?? (autoPlay ? DEMO_ENTRIES : []);
  const LOOP = base.length * STEP + HOLD;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  React.useEffect(() => {
    if (!autoPlay || !visible || reduce) return;
    const id = setInterval(() => setTick((t) => (t + TICK) % LOOP), TICK);
    return () => clearInterval(id);
  }, [autoPlay, visible, reduce, LOOP]);

  React.useEffect(() => {
    if (autoPlay && visible && openProp === undefined) {
      setInnerOpen(true);
    }
  }, [autoPlay, visible, openProp]);

  let entries = base;
  if (autoPlay && base.length > 0) {
    const t = reduce ? LOOP - 1 : tick;
    const count = Math.min(base.length, Math.max(1, Math.floor(t / STEP) + 1));
    entries = base.slice(0, count);
  }

  function setOpen(next: boolean) {
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div
      ref={ref}
      data-slot="agent-memory"
      className={cn(
        "w-full max-w-md overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xs",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Brain className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium">{title}</span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {entries.length}
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
          <motion.div layout={!reduce} className="space-y-2 border-t border-border px-3 py-3">
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {entries.map((entry) => (
                  <motion.li
                    key={entry.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <p className="text-sm leading-snug">{entry.fact}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {entry.scope ? (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {entry.scope}
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="flex gap-0.5">
                        {onEdit ? (
                          <button
                            type="button"
                            aria-label={`Edit ${entry.fact}`}
                            onClick={() => onEdit(entry.id)}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </button>
                        ) : null}
                        {onRemove ? (
                          <button
                            type="button"
                            aria-label={`Remove ${entry.fact}`}
                            onClick={() => onRemove(entry.id)}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {onAdd ? (
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={onAdd}>
                <Plus className="size-3.5" aria-hidden />
                Add memory
              </Button>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}