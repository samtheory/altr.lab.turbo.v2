import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Typed selection sync for the Studio contextual sidebar (S0047).
 *
 * Each section reads its own query key (`table`, `job`, `endpoint`, `query`,
 * `user`) and rewrites only that key on selection, so the content pane can read
 * the same param and the refresh restores the screen. Selection clears the key
 * when the id is empty.
 */
type SelectionOpts = {
  /** Query key for this section (e.g. "table"). */
  key: string;
  /** Current pathname (so we don't lose other query params). */
  pathname: string;
  /** Current searchParams snapshot. */
  searchParams: URLSearchParams;
  /** Called when the selection changes. */
  onSelect: (id: string) => void;
};

export function useSidebarSelection(opts: SelectionOpts) {
  const { key, pathname, searchParams, onSelect } = opts;
  const router = useRouter();

  const select = useCallback(
    (id: string) => {
      onSelect(id);
      const next = new URLSearchParams(searchParams.toString());
      if (id) next.set(key, id);
      else next.delete(key);
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [key, pathname, router, searchParams, onSelect],
  );

  const clearSelection = useCallback(() => select(""), [select]);

  return { select, clearSelection };
}

/** Derive the selection id for a given key from the URL. */
export function selectionIdFor(
  searchParams: URLSearchParams,
  key: string,
): string {
  const raw = searchParams.get(key);
  return raw && raw !== "" ? raw : "";
}

/** Search query param shared by searchable sections (q). */
export function useSidebarSearch(
  pathname: string,
  searchParams: URLSearchParams,
  onSearchChange: (value: string) => void,
) {
  const router = useRouter();

  const setSearch = useCallback(
    (value: string) => {
      onSearchChange(value);
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, onSearchChange],
  );

  const current = searchParams.get("q") ?? "";

  return { searchValue: current, setSearch };
}
