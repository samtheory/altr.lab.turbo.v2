"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type PhoneFrameProps = {
  children?: React.ReactNode;
  className?: string;
};

export function PhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <div data-slot="phone-frame" className={cn("relative rounded-[2rem] border-[6px] border-foreground/15 bg-foreground/10 p-1 shadow-md", className)}>
      <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-foreground/20" aria-hidden />
      <div className="overflow-hidden rounded-[1.6rem] bg-background">{children}</div>
    </div>
  );
}
