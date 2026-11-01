"use client";

import type { ReactNode } from "react";
import { Button } from "@altr/apolyx";
import { X as XIcon } from "lucide-react";

export const INSPECTOR_TITLE_ID = "jord-inspector-title";

export function InspectorPanelChrome({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-slot="inspector-panel">
      <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <h2
          id={INSPECTOR_TITLE_ID}
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close inspector"
          className="shrink-0"
          onClick={onClose}
        >
          <XIcon className="size-4" aria-hidden />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}

/** Sticky footer slot for primary actions inside inspector panels. */
export function InspectorFooter({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="inspector-footer"
      className="sticky bottom-0 z-10 mt-auto flex shrink-0 flex-wrap gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm"
    >
      {children}
    </div>
  );
}
