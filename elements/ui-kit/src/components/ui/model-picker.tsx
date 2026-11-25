"use client";

import * as React from "react";
import { Brain, Check, ChevronDown, Gauge, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";

export type ModelOption = {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  tags?: string[];
  reasoning?: boolean;
};

export type ReasoningEffort = "low" | "medium" | "high";

export type ModelPickerProps = {
  models?: ModelOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  effort?: ReasoningEffort;
  defaultEffort?: ReasoningEffort;
  onEffortChange?: (effort: ReasoningEffort) => void;
  side?: "top" | "bottom";
  autoPlay?: boolean;
  className?: string;
};

const MODELS: ModelOption[] = [
  {
    id: "anthropic/claude-opus-5.5",
    name: "Claude Opus 5.5",
    provider: "Anthropic",
    description: "Hardest tasks, long agent runs",
    tags: ["Best", "$$$"],
    reasoning: true,
  },
  {
    id: "anthropic/claude-sonnet-5.5",
    name: "Claude Sonnet 5.5",
    provider: "Anthropic",
    description: "Everyday coding and writing",
    tags: ["Balanced"],
    reasoning: true,
  },
  {
    id: "anthropic/claude-haiku-5.5",
    name: "Claude Haiku 5.5",
    provider: "Anthropic",
    description: "Quick answers and tool calls",
    tags: ["Fast", "$"],
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description: "General purpose",
    tags: ["Vision"],
    reasoning: true,
  },
];

const EFFORTS: { id: ReasoningEffort; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

const OPEN = 900;
const STEP = 550;
const TICK = 50;

/** Compact model switcher with optional reasoning-effort toggle. */
export function ModelPicker({
  models = MODELS,
  value,
  defaultValue,
  onValueChange,
  effort: effortProp,
  defaultEffort = "medium",
  onEffortChange,
  side = "top",
  autoPlay = false,
  className,
}: ModelPickerProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listId = useId();
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [innerValue, setInnerValue] = React.useState(
    defaultValue ?? models[1]?.id ?? models[0]!.id,
  );
  const [innerEffort, setInnerEffort] = React.useState<ReasoningEffort>(defaultEffort);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [touched, setTouched] = React.useState(false);

  const target = 0;
  const start = models.findIndex((m) => m.id === (defaultValue ?? models[1]?.id));
  const walk = Math.abs(start - target);
  const PICK = OPEN + STEP * (walk + 1);
  const EFFORT = PICK + 900;
  const LOOP = EFFORT + 2600;

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
    if (!autoPlay || !visible || reduce || touched) return;
    const id = setInterval(() => setTick((t) => (t + TICK) % LOOP), TICK);
    return () => clearInterval(id);
  }, [autoPlay, visible, reduce, touched, LOOP]);

  const scripted = autoPlay && !reduce && !touched;
  const sOpen = scripted && tick >= OPEN && tick < PICK;
  const sActive = scripted
    ? Math.max(target, start - Math.max(0, Math.floor((tick - OPEN) / STEP)))
    : 0;
  const sValue =
    scripted && tick >= PICK
      ? models[target]!.id
      : (defaultValue ?? models[1]?.id ?? models[0]!.id);
  const sEffort: ReasoningEffort = scripted && tick >= EFFORT ? "high" : defaultEffort;

  const current = value ?? (scripted ? sValue : innerValue);
  const effort = effortProp ?? (scripted ? sEffort : innerEffort);
  const isOpen = scripted ? sOpen : open;
  const activeIndex = scripted ? sActive : active;
  const model = models.find((m) => m.id === current) ?? models[0]!;

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  React.useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  function takeOver() {
    if (!touched) {
      setTouched(true);
      setInnerValue(current);
      setInnerEffort(effort);
    }
  }

  function toggle() {
    takeOver();
    setActive(Math.max(0, models.findIndex((m) => m.id === current)));
    setOpen((o) => !o);
  }

  function pick(id: string) {
    if (value === undefined) setInnerValue(id);
    onValueChange?.(id);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function pickEffort(next: ReasoningEffort) {
    takeOver();
    if (effortProp === undefined) setInnerEffort(next);
    onEffortChange?.(next);
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(models.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(models[active]!.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div
      ref={ref}
      data-slot="model-picker"
      className={cn("relative inline-flex items-center gap-1.5 text-foreground", className)}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium shadow-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={model.id}
            initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? undefined : { opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {model.name}
          </motion.span>
        </AnimatePresence>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {model.reasoning && (
        <div
          role="radiogroup"
          aria-label="Reasoning effort"
          className="flex h-8 items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-xs"
        >
          <Brain className="mx-1.5 size-3.5 text-muted-foreground" aria-hidden />
          {EFFORTS.map((e) => {
            const on = e.id === effort;
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pickEffort(e.id)}
                className={cn(
                  "relative h-full rounded-full px-2.5 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {on && (
                  <motion.span
                    layoutId={reduce ? undefined : `${listId}-effort`}
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    aria-hidden
                  />
                )}
                <span className="relative">{e.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label="Model"
            aria-activedescendant={`${listId}-${activeIndex}`}
            onKeyDown={onListKey}
            initial={reduce ? false : { opacity: 0, y: side === "top" ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: side === "top" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute left-0 z-20 w-72 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
              side === "top" ? "bottom-full mb-2 origin-bottom-left" : "top-full mt-2 origin-top-left",
            )}
          >
            {models.map((m, i) => {
              const header =
                m.provider && m.provider !== models[i - 1]?.provider ? m.provider : null;
              const selected = m.id === current;
              return (
                <li key={m.id} role="none">
                  {header && (
                    <p className="px-2.5 pt-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {header}
                    </p>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      takeOver();
                      pick(m.id);
                    }}
                    onPointerMove={() => !scripted && setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2",
                      i === activeIndex && "bg-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        {m.name}
                        {m.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-0.5 rounded bg-muted px-1 py-px text-[10px] font-normal text-muted-foreground"
                          >
                            {tag === "Fast" && <Zap className="size-2.5" aria-hidden />}
                            {tag === "Balanced" && <Gauge className="size-2.5" aria-hidden />}
                            {tag}
                          </span>
                        ))}
                      </span>
                      {m.description && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {m.description}
                        </span>
                      )}
                    </span>
                    {selected && <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
                  </div>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
