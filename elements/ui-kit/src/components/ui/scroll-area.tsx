"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Scroll direction affordance for overflow. */
  orientation?: "vertical" | "horizontal" | "both";
  ref?: React.Ref<HTMLDivElement>;
};

/**
 * Owned scrollport with token-styled scrollbars. No third-party scroll library.
 */
export function ScrollArea({
  className,
  orientation = "vertical",
  children,
  ref,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      ref={ref}
      data-slot="scroll-area"
      data-orientation={orientation}
      className={cn(
        "relative",
        orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
        orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
        orientation === "both" && "overflow-auto",
        // Firefox
        "[scrollbar-width:thin] [scrollbar-color:color-mix(in_oklch,var(--muted-foreground)_35%,transparent)_transparent]",
        // WebKit
        "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
