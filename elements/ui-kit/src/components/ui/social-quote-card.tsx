"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type SocialQuoteCardProps = {
  name: string;
  handle?: string;
  text: string;
  avatar?: React.ReactNode;
  className?: string;
};

export function SocialQuoteCard({ name, handle, text, avatar, className }: SocialQuoteCardProps) {
  return (
    <figure data-slot="social-quote-card" className={cn("max-w-md rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">{avatar ?? name.slice(0, 1)}</div>
        <figcaption>
          <div className="font-medium leading-none">{name}</div>
          {handle ? <div className="text-sm text-muted-foreground">{handle}</div> : null}
        </figcaption>
      </div>
      <blockquote className="mt-3 text-[15px] leading-relaxed text-foreground/90">&ldquo;{text}&rdquo;</blockquote>
    </figure>
  );
}
