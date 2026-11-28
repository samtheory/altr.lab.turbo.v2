"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type FocusCardItem = {
  title: string;
  description?: string;
  image?: string;
  href?: string;
};

export type FocusCardsProps = {
  items: FocusCardItem[];
  className?: string;
};

export function FocusCards({ items, className }: FocusCardsProps) {
  const [focused, setFocused] = React.useState<number | null>(null);

  return (
    <div data-slot="focus-cards" className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      {items.map((item, i) => {
        const dimmed = focused !== null && focused !== i;
        const cardClass = cn(
          "block flex-1 rounded-xl border border-border bg-card p-4 transition-opacity duration-200",
          dimmed && "opacity-35",
          focused === i && "opacity-100 ring-2 ring-primary/40",
        );
        const body = (
          <>
            {item.image ? (
              <img src={item.image} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" />
            ) : null}
            <p className="font-medium text-foreground">{item.title}</p>
            {item.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            ) : null}
          </>
        );
        const handlers = {
          onPointerEnter: () => setFocused(i),
          onPointerLeave: () => setFocused(null),
        };

        return item.href ? (
          <a
            key={item.title}
            href={item.href}
            data-slot="focus-cards-item"
            className={cardClass}
            {...handlers}
          >
            {body}
          </a>
        ) : (
          <div key={item.title} data-slot="focus-cards-item" className={cardClass} {...handlers}>
            {body}
          </div>
        );
      })}
    </div>
  );
}