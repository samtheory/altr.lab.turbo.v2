"use client";

import { forwardRef, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
} from "@altr/apolyx";
import { Search, Filter, X } from "lucide-react";

/**
 * Shared compositional sidebar list for Studio contextual columns (S0047).
 * It is a layout primitive only — it does not fetch, does not know any Jord
 * domain model, and never reaches into @altr/jord. Pages compose the actual
 * items, badges, and selection behaviour around it.
 */
export type SidebarItem = {
  id: string;
  label: string;
  meta?: string;
  badge?: ReactNode;
  href?: string;
  /** Optional sticky group label rendered as a subhead above the item row. */
  group?: string;
  /** Per-item "not selected" hint text shown under the label. */
  hint?: string;
};

type Props = {
  /** List header (the uppercase eyebrow shown above search/filter). */
  header: string;
  /** Placeholder shown when the list is empty. */
  empty?: ReactNode;
  /** Error message shown on load failure.
   * When `retry` is set, a Retry button is rendered.
   */
  error?: string;
  /** When true, the list is in a loading state. */
  loading?: boolean;
  /** Search query controlled by the caller.
   * Pass `true` to show the search field; the input value is controlled by `searchValue`.
   */
  searchable?: boolean;
  /** Controlled search value. */
  searchValue?: string;
  /** Called on every search input change (debounced inside the component by ~150ms). */
  onSearchChange?: (value: string) => void;
  /** Optional filter control.
   * When `filterOptions` is set, a compact filter dropdown is shown before the list.
   */
  filterOptions?: { value: string; label: string }[];
  /** Controlled filter value. */
  filterValue?: string;
  /** Called when the filter changes. */
  onFilterChange?: (value: string) => void;
  /** The items to render. When empty and not loading, `empty` is shown. */
  items: SidebarItem[];
  /** Currently selected item id (for highlight only — selection routing is caller-owned). */
  selectedId?: string;
  /** Called when an item is clicked. */
  onSelect?: (item: SidebarItem, index: number) => void;
  /** Optional aria-label for the list region. */
  listAriaLabel?: string;
  /** Optional className on the list body. */
  className?: string;
  /** Ref forwarded to the scroll container so callers can focus it. */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  /** Optional footer rendered beneath the list (e.g. a create action). */
  footer?: ReactNode;
};

type Status = "idle" | "loading" | "empty" | "error";

export const StudioSidebarList = forwardRef<HTMLDivElement, Props>(
  (
    {
      header,
      empty,
      error,
      loading = false,
      searchable = false,
      searchValue = "",
      onSearchChange,
      filterOptions,
      filterValue = "",
      onFilterChange,
      items,
      selectedId,
      onSelect,
      listAriaLabel,
      className,
      scrollRef,
      footer,
    },
    ref,
  ) => {
    const [internalSearch, setInternalSearch] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listEl = useRef<HTMLDivElement | null>(null);
    const mergedRef = useRef<HTMLDivElement | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const effectiveSearch = searchable ? searchValue : internalSearch;

    useEffect(() => {
      if (!searchable) return;
      setInternalSearch("");
    }, [searchable]);

    useEffect(() => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (!searchable || onSearchChange == null) return;
      searchTimer.current = setTimeout(() => {
        onSearchChange(effectiveSearch);
      }, 150);
      return () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
      };
    }, [searchable, effectiveSearch, onSearchChange]);

    useEffect(() => {
      if (error != null) setStatus("error");
      else if (loading) setStatus("loading");
      else if (items.length === 0) setStatus("empty");
      else setStatus("idle");
    }, [error, loading, items.length]);

    const focusList = () => {
      mergedRef.current?.focus();
    };

    useEffect(() => {
      mergedRef.current = listEl.current ?? null;
      if (typeof ref === "function") ref(mergedRef.current);
      else if (ref) ref.current = mergedRef.current;
      return () => {
        if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    }, [ref]);

    // Keyboard: / focuses search when searchable; Escape clears search and returns focus to list.
    useEffect(() => {
      if (!searchable) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "/" && document.activeElement !== inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        }
        if (e.key === "Escape" && document.activeElement === inputRef.current) {
          inputRef.current.blur();
          setInternalSearch("");
          if (onSearchChange) onSearchChange("");
          focusList();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [searchable, onSearchChange]);

    const renderItem = (item: SidebarItem, index: number) => {
      const active = selectedId === item.id;
      return (
        <div
          key={item.id}
          role="button"
          tabIndex={active ? 0 : -1}
          aria-selected={active}
          aria-current={active ? "true" : undefined}
          onClick={() => onSelect?.(item, index)}
          className={cn(
            "group relative flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2.5 text-sm transition-colors",
            active
              ? "bg-muted font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-xs">{item.label}</span>
            {item.badge ? (
              <div className="shrink-0">{item.badge}</div>
            ) : item.group ? (
              <div className="shrink-0" />
            ) : null}
          </div>
          {item.meta && (
            <div className="truncate text-[11px] text-muted-foreground">
              {item.meta}
            </div>
          )}
          {item.hint && !item.meta && (
            <div className="truncate text-[11px] text-muted-foreground">
              {item.hint}
            </div>
          )}
        </div>
      );
    };

    const listedItems = items.filter((item) => !item.group);
    const groupedItems = items.filter((item) => item.group);

    const renderGrouped = () => {
      const groups: Record<string, SidebarItem[]> = {};
      for (const item of groupedItems) {
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
      }
      return Object.entries(groups).map(([group, groupItems]) => (
        <div key={group} className="flex flex-col gap-1 px-1 pt-2">
          <div className="sticky top-0 z-10 -mb-2 mt-2 flex h-5 items-center justify-between gap-2 border-b border-border/80 bg-background/95 px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            <span>{group}</span>
          </div>
          {groupItems.map((item, i) => (
            <div
              key={item.id}
              ref={(el) => {
                // No-op: group items don't need their own ref.
              }}
            >
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      ));
    };

    const renderFlat = () => (
      <div className="flex flex-col gap-0.5">
        {listedItems.map((item, i) => renderItem(item, i))}
      </div>
    );

    const showFooter = !loading && status === "idle" && footer;

    return (
      <div
        ref={mergedRef as React.Ref<HTMLDivElement>}
        data-sidebar-list
        className={cn(
          "flex flex-1 flex-col min-h-0",
          className,
        )}
        aria-label={listAriaLabel ?? header}
      >
        {/* Sticky header: eyebrow + search + filter */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/80 bg-background/95 px-3 py-2 backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {header}
          </p>
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  ref={inputRef}
                  value={effectiveSearch}
                  onValueChange={setInternalSearch}
                  placeholder="Search…"
                  className="w-full pl-7"
                  aria-label={`Search ${header.toLowerCase()}`}
                />
                {effectiveSearch && (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                    onClick={() => {
                      setInternalSearch("");
                      if (onSearchChange) onSearchChange("");
                      focusList();
                    }}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                )}
              </div>
            )}
            {filterOptions && filterOptions.length > 0 && (
              <Select
                value={filterValue}
                onValueChange={(v) => onFilterChange?.(v)}
                aria-label={`Filter ${header.toLowerCase()}`}
              >
                <SelectTrigger className="w-[min(100%,9rem)]">
                  <Filter className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* List body: skeleton / empty / error / items */}
        <div
          ref={listEl as React.Ref<HTMLDivElement>}
          className={cn(
            "flex flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden",
            status === "idle" && "pt-1",
          )}
          aria-busy={status === "loading"}
        >
          {status === "loading" && (
            <SidebarListItemSkeleton count={3} />
          )}
          {status === "empty" && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {empty ?? `No ${header.toLowerCase()} yet`}
              </p>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-3 py-6 text-center">
              <p className="text-sm text-destructive">{error ?? "Could not load list"}</p>
              {error && (
                <button
                  type="button"
                  className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setStatus("loading")}
                  aria-label="Retry loading"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {status === "idle" && items.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-0.5"
            >
              {renderGrouped()}
              {renderFlat()}
            </motion.div>
          )}
          {showFooter && (
            <div className="sticky bottom-0 z-10 border-t border-border/80 bg-background/95 pt-2 backdrop-blur-sm">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  },
);

StudioSidebarList.displayName = "StudioSidebarList";

function SidebarListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Small inline badge chip used in sidebar item rows. */
export function SidebarBadge({
  variant = "outline",
  className,
  children,
}: {
  variant?: "default" | "secondary" | "destructive" | "success" | "outline";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge
      variant={variant}
      className={cn(
        "shrink-0 text-[10px] uppercase font-medium",
        className,
      )}
    >
      {children}
    </Badge>
  );
}
