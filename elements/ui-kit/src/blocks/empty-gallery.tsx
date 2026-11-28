"use client";

import * as React from "react";
import { ImageIcon, Plus } from "lucide-react";
import { motion, useInView } from "motion/react";

import { EmptyState } from "../components/ui/empty-state";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type EmptyGalleryProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode | null;
  onAction?: () => void;
  className?: string;
};

function GalleryPlaceholder() {
  const slots = [
    "col-span-2 row-span-2",
    "col-span-1",
    "col-span-1",
    "col-span-1",
    "col-span-1",
  ];
  return (
    <div
      aria-hidden
      className="grid w-full max-w-sm grid-cols-3 grid-rows-2 gap-2 p-2"
    >
      {slots.map((slot, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50",
            slot,
            i === 0 ? "min-h-28" : "min-h-14",
          )}
        >
          <ImageIcon className="size-5 text-muted-foreground/60" />
        </div>
      ))}
    </div>
  );
}

/** Empty state with picture / thumbnail placeholders and CTA. */
export function EmptyGallery({
  title = "No media yet",
  description = "Upload images or drop files here to build your gallery.",
  actionLabel = "Upload media",
  onAction,
  className,
}: EmptyGalleryProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      data-slot="empty-gallery"
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
        illustration={<GalleryPlaceholder />}
      />
    </motion.div>
  );
}