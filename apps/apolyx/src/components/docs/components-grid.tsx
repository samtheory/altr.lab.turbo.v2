"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@altr/apolyx";

import { docHref, docsConfig, type DocItem } from "@/docs-config";
import { DocStatusBadge } from "@/components/site/doc-status-badge";

function componentItems(): DocItem[] {
  return docsConfig
    .filter((group) => group.title === "Components" || group.title === "Forms" || group.title === "Navigation" || group.title === "Data")
    .flatMap((group) =>
      group.items.filter(
        (item) =>
          item.slug.startsWith("components/") && item.slug !== "components",
      ),
    );
}

export function ComponentsGrid({
  items: itemsProp,
}: {
  items?: DocItem[];
}) {
  const items = React.useMemo(() => itemsProp ?? componentItems(), [itemsProp]);
  const [query, setQuery] = React.useState("");
  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="not-prose space-y-6">
      <label className="relative block max-w-md">
        <span className="sr-only">Filter components</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter components…"
          className="flex h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <li key={item.slug}>
            <Link
              href={docHref(item.slug)}
              className={cn(
                "group flex h-full flex-col gap-2 rounded-2xl border border-border/80 bg-card/30 p-4 transition-[border-color,background-color,transform,box-shadow] duration-200",
                "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/40 hover:shadow-[0_12px_30px_-18px_color-mix(in_oklch,var(--primary)_45%,transparent)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-base font-semibold tracking-tight group-hover:text-foreground">
                  {item.title}
                </span>
                <DocStatusBadge status={item.status} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {item.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No components match “{query}”.</p>
      ) : null}
    </div>
  );
}
