import { createContext, createElement, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Realtime } from "@altr/jord-client";
import { QueryCache } from "./cache.js";
import type { JordClientLike } from "./types.js";

export interface JordContextValue {
  client: JordClientLike;
  realtime?: Realtime;
  cache: QueryCache;
}

const JordContext = createContext<JordContextValue | null>(null);

export interface JordProviderProps {
  /**
   * Typed client. The cache is keyed to this object's identity: create it once
   * (`useMemo` / module scope). An inline `client={createClient(...)}` makes a new
   * cache on every render.
   */
  client: JordClientLike | object;
  /** Realtime handle (also part of the cache identity; memoize it too). */
  realtime?: Realtime;
  /**
   * Identity scope of the cached data, e.g. the signed-in user id or an auth epoch.
   * REQUIRED whenever the same `client` object can change identity (token swap /
   * sign-in as someone else): changing it disposes the previous cache so one user's
   * rows can never be served to the next.
   */
  scope?: string | number;
  /** Unobserved cache entries are dropped after this long. Default 5 minutes. */
  gcTimeMs?: number;
  /** LRU bound on cached queries. Default 100. */
  maxEntries?: number;
  children?: ReactNode;
}

/**
 * Supplies the client, optional realtime handle and a query cache to the hooks.
 *
 * A fresh cache is created whenever `client`, `realtime` or `scope` changes; the old one
 * is disposed (timers cleared, live subscriptions closed, entries dropped), and so is the
 * cache when the provider unmounts. Pass `scope` (user id / auth epoch) when the client
 * object survives a sign-in change, and call `useJordCache().clear()` on sign-out.
 *
 * The package suite runs on React 19 (devDependency). React 18 is in the peer range: only
 * `useSyncExternalStore` and standard hooks are used, and the same suite passed once
 * against react/react-dom 18.3.1 through a local alias config; that run is not wired into CI.
 */
export function JordProvider(props: JordProviderProps) {
  const { client, realtime, scope, gcTimeMs, maxEntries, children } = props;
  // One cache per (client, realtime, scope); options are read at creation.
  const value = useMemo<JordContextValue>(() => {
    const c = client as JordClientLike;
    return { client: c, realtime, cache: new QueryCache(c, realtime, { gcTimeMs, maxEntries }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, realtime, scope]);
  // Dispose on identity change / unmount (deferred a microtask so StrictMode remounts keep it).
  useEffect(() => value.cache.retainOwner(), [value.cache]);
  return createElement(JordContext.Provider, { value }, children);
}

function useCtx(): JordContextValue {
  const v = useContext(JordContext);
  if (!v) throw new Error("useJord* hooks must be used inside <JordProvider>");
  return v;
}

/** The typed client given to the provider. */
export function useJordClient<C = JordClientLike>(): C {
  return useCtx().client as unknown as C;
}

export function useJordRealtime(): Realtime | undefined {
  return useCtx().realtime;
}

/**
 * Imperative cache access: `invalidate(keyOrTable)`, and `clear()` to drop every cached
 * row (call it on sign-out; observed queries refetch with the current credentials).
 */
export function useJordCache(): { invalidate: (target?: string) => void; clear: () => void } {
  const { cache } = useCtx();
  return useMemo(
    () => ({ invalidate: (t?: string) => cache.invalidate(t), clear: () => cache.clear() }),
    [cache],
  );
}

export { useCtx as useJordContext };
