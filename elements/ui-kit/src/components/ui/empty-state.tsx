"use client";

import * as React from "react";
import { Plus, type LucideIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./button";

function SkeletonCard({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "w-36 shrink-0 overflow-hidden rounded-lg border bg-card",
        featured
          ? "relative z-10 -translate-y-2 shadow-lg shadow-black/5 dark:shadow-black/40"
          : "opacity-60",
      )}
    >
      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2">
          <span className="size-6 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-1">
            <span className="block h-1.5 w-1/2 rounded-full bg-muted" />
            <span className="block h-1.5 w-3/4 rounded-full bg-muted" />
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="block h-1.5 w-full rounded-full bg-muted" />
          <span className="block h-1.5 w-4/5 rounded-full bg-muted" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t bg-muted/40 px-3 py-2">
        <span className="h-1.5 flex-1 rounded-full bg-muted" />
        <span className="size-3.5 rounded-sm bg-muted" />
        <span className="size-3.5 rounded-sm bg-muted" />
      </div>
    </div>
  );
}

export type EmptyStateProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Primary button label; pass `null` to hide. */
  actionLabel?: React.ReactNode | null;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  /** Outline button label; pass `null` to hide. */
  secondaryActionLabel?: React.ReactNode | null;
  onSecondaryAction?: () => void;
  /** Replace the default skeleton-card illustration. */
  illustration?: React.ReactNode;
  className?: string;
};

/** Dashed empty surface with optional illustration, copy, and actions. */
export function EmptyState({
  title = "No projects yet",
  description = "Create your first project to start inviting your team.",
  actionLabel = "New project",
  actionIcon: ActionIcon = Plus,
  onAction,
  secondaryActionLabel = "Import",
  onSecondaryAction,
  illustration,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex w-full max-w-md flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      {illustration ?? (
        <div
          aria-hidden
          className="flex w-full justify-center gap-3 overflow-hidden pt-2 [mask-image:linear-gradient(to_right,transparent,black_30%,black_70%,transparent)]"
        >
          <SkeletonCard />
          <SkeletonCard featured />
          <SkeletonCard />
        </div>
      )}
      <h3 className="mt-6 font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-64 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex gap-2">
          {actionLabel ? (
            <Button onClick={onAction}>
              <ActionIcon /> {actionLabel}
            </Button>
          ) : null}
          {secondaryActionLabel ? (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
