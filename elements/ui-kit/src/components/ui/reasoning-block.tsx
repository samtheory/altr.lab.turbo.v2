"use client";

import * as React from "react";
import { Brain, ChevronDown } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useId } from "../../primitives/use-id";

export type ReasoningBlockProps = {
  title?: string;
  children?: React.ReactNode;
  streaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** Collapsible chain-of-thought panel. */
export function ReasoningBlock({
  title = "Reasoning",
  children,
  streaming = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
}: ReasoningBlockProps) {
  const bodyId = useId();
  const reduce = useReducedMotion();
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen || streaming);
  const open = openProp ?? innerOpen;

  React.useEffect(() => {
    if (streaming && openProp === undefined) setInnerOpen(true);
  }, [streaming, openProp]);

  return (
    <div
      data-slot="reasoning-block"
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-xl border border-border bg-muted/40 text-foreground",
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
        <Brain className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium">{title}</span>
        {streaming && (
          <motion.span
            className="text-xs text-muted-foreground"
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={reduce ? undefined : { duration: 1.4, repeat: Infinity }}
          >
            thinking…
          </motion.span>
        )}
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
          <div className="border-t border-border px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
