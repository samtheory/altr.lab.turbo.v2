"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type LinkPeekProps = {
  href: string;
  children: React.ReactNode;
  preview?: React.ReactNode;
  title?: string;
  description?: string;
  image?: string;
  className?: string;
  peekClassName?: string;
};

export function LinkPeek({
  href,
  children,
  preview,
  title,
  description,
  image,
  className,
  peekClassName,
}: LinkPeekProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  const card =
    preview ??
    (title || description || image ? (
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
        {image ? <img src={image} alt="" className="h-28 w-full object-cover" /> : null}
        <div className="space-y-1 p-3">
          {title ? <div className="text-sm font-medium text-foreground">{title}</div> : null}
          {description ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    ) : null);

  return (
    <span data-slot="link-peek" className={cn("relative inline", className)}>
      <a
        href={href}
        className="font-medium text-primary underline-offset-4 hover:underline"
        aria-describedby={open && card ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </a>
      <AnimatePresence>
        {open && card && !reduce ? (
          <motion.div
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2",
              peekClassName,
            )}
          >
            {card}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  );
}