"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { motion, useInView } from "motion/react";

import { EmptyState } from "../components/ui/empty-state";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type EmptyCardsProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode | null;
  onAction?: () => void;
  className?: string;
};

function CardPlaceholder({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "w-32 shrink-0 overflow-hidden rounded-lg border bg-card",
        featured
          ? "relative z-10 -translate-y-1 shadow-md shadow-black/5 dark:shadow-black/30"
          : "opacity-55",
      )}
    >
      <div className="space-y-2 p-3">
        <div className="h-2 w-2/3 rounded-full bg-muted" />
        <div className="h-2 w-full rounded-full bg-muted" />
        <div className="h-2 w-4/5 rounded-full bg-muted" />
      </div>
      <div className="border-t bg-muted/30 px-3 py-2">
        <div className="h-2 w-1/2 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function CardsIllustration() {
  return (
    <div
      aria-hidden
      className="flex w-full justify-center gap-2 overflow-hidden pt-1 [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)]"
    >
      <CardPlaceholder />
      <CardPlaceholder featured />
      <CardPlaceholder />
    </div>
  );
}

/** Empty state with stacked card placeholders. */
export function EmptyCards({
  title = "No cards yet",
  description = "Create a card to organize content, links, and quick actions.",
  actionLabel = "New card",
  onAction,
  className,
}: EmptyCardsProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      data-slot="empty-cards"
      className={cn("flex w-full justify-center", className)}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <EmptyState
        title={title}
        description={description}
        actionLabel={actionLabel}
        actionIcon={Plus}
        onAction={onAction}
        secondaryActionLabel={null}
        illustration={<CardsIllustration />}
      />
    </motion.div>
  );
}