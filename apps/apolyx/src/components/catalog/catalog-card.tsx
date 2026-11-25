"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge, cn } from "@altr/apolyx";

import type { CatalogEntry } from "@/catalog/entries";
import { DocStatusBadge } from "@/components/site/doc-status-badge";

export function CatalogCard({ entry }: { entry: CatalogEntry }) {
  const rootRef = React.useRef<HTMLElement>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([hit]) => {
        if (hit?.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px", threshold: 0.05 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <article
      ref={rootRef}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/40",
        "transition-[border-color,box-shadow,transform] duration-200",
        "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_40px_-24px_color-mix(in_oklch,var(--primary)_40%,transparent)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      <div className="relative isolate aspect-[16/11] overflow-hidden border-b border-border/60 bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklch,var(--muted)_75%,transparent),transparent)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_70%,color-mix(in_oklch,var(--card)_88%,transparent))]"
        />
        {active ? (
          <iframe
            title={`${entry.title} preview`}
            src={`/docs/preview/${entry.demo}?embed=1`}
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 scale-[0.5] border-0 bg-background"
            tabIndex={-1}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-muted/40" />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {entry.animated ? (
            <Badge
              variant="secondary"
              className="gap-1 border border-border/60 bg-background/85 px-1.5 py-0 text-[10px] font-medium backdrop-blur-sm"
            >
              <Sparkles className="size-3" aria-hidden />
              Animated
            </Badge>
          ) : null}
          <DocStatusBadge status={entry.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="font-display text-base font-semibold tracking-tight">{entry.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {entry.description}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-3 pt-1">
          <Link
            href={entry.href}
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium text-foreground",
              "underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            Open docs
            <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
          </Link>
          <Link
            href={`/docs/preview/${entry.demo}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Full preview
          </Link>
        </div>
      </div>
    </article>
  );
}
