"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type BrowserFrameProps = {
  children?: React.ReactNode;
  url?: string;
  className?: string;
};

export function BrowserFrame({ children, url = "apolyx.dev", className }: BrowserFrameProps) {
  return (
    <div data-slot="browser-frame" className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive/80" aria-hidden />
        <span className="size-2.5 rounded-full bg-warning/80" aria-hidden />
        <span className="size-2.5 rounded-full bg-success/80" aria-hidden />
        <span className="ml-2 truncate rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground">{url}</span>
      </div>
      <div className="bg-background">{children}</div>
    </div>
  );
}
