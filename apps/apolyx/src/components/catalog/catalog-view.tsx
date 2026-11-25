"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@altr/apolyx";

import {
  CATALOG_SECTIONS,
  catalogCount,
  catalogEntries,
  type CatalogSection,
} from "@/catalog/entries";
import { CatalogCard } from "@/components/catalog/catalog-card";

function useSectionParam(defaultSection: CatalogSection = "components") {
  const [section, setSection] = React.useState<CatalogSection>(defaultSection);

  React.useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "") as CatalogSection;
    if (CATALOG_SECTIONS.some((s) => s.id === fromHash)) {
      setSection(fromHash);
    }
  }, []);

  const onSectionChange = React.useCallback((value: string) => {
    const next = value as CatalogSection;
    setSection(next);
    const url = new URL(window.location.href);
    url.hash = next;
    window.history.replaceState(null, "", url);
  }, []);

  return { section, onSectionChange };
}

export function CatalogView() {
  const { section, onSectionChange } = useSectionParam();
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const matchesQuery = React.useCallback(
    (entry: (typeof catalogEntries)[number]) => {
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.demo.toLowerCase().includes(q)
      );
    },
    [q],
  );

  const activeMeta = CATALOG_SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="space-y-8">
      <Tabs value={section} onValueChange={onSectionChange} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <TabsList aria-label="Catalog sections" className="h-auto flex-wrap justify-start gap-1 p-1">
            {CATALOG_SECTIONS.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="gap-2 px-3 py-1.5">
                {item.label}
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {catalogCount(item.id)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Filter {activeMeta.label.toLowerCase()}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${activeMeta.label.toLowerCase()}…`}
              className={cn(
                "flex h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </label>
        </div>

        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {activeMeta.description}
        </p>

        {CATALOG_SECTIONS.map((item) => {
          const items = catalogEntries.filter(
            (entry) => entry.section === item.id && matchesQuery(entry),
          );
          return (
            <TabsContent key={item.id} value={item.id} className="mt-0 outline-none">
              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  {q
                    ? `No ${item.label.toLowerCase()} match “${query}”.`
                    : `No ${item.label.toLowerCase()} yet — check back as the kit grows.`}
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((entry) => (
                    <li key={entry.id}>
                      <CatalogCard entry={entry} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
