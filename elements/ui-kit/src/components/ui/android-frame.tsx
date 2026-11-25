"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type AndroidFrameProps = {
  children?: React.ReactNode;
  className?: string;
};

export function AndroidFrame({ children, className }: AndroidFrameProps) {
  return (
    <div data-slot="android-frame" className={cn("overflow-hidden rounded-[1.25rem] border-2 border-border bg-card shadow-sm", className)}>
      <div className="flex h-6 items-center justify-between bg-muted/50 px-3 text-[10px] text-muted-foreground">
        <span>9:41</span>
        <span className="flex gap-1" aria-hidden>
          <span className="size-1 rounded-full bg-current" />
          <span className="size-1 rounded-full bg-current opacity-70" />
        </span>
      </div>
      <div className="bg-background">{children}</div>
      <div className="mx-auto my-1 h-1 w-16 rounded-full bg-foreground/20" aria-hidden />
    </div>
  );
}
