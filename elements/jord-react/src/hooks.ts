import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { queryKey, type EntrySnapshot } from "./cache.js";
import { useJordContext } from "./provider.js";
import type { JordQueryInput, LiveResult, QueryResult, Row } from "./types.js";

const SERVER_SNAP: EntrySnapshot = {
  data: null,
  error: null,
  status: "loading",
  isFetching: false,
  liveState: "closed",
  liveError: null,
};

function useQueryCore(input: JordQueryInput, live: boolean): LiveResult {
  const { cache } = useJordContext();
  const key = queryKey(input);
  // Latest input without making effects depend on object identity: the key is the identity.
  const inputRef = useRef(input);
  inputRef.current = input;
  const stable = useMemo(() => inputRef.current, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const enabled = input.enabled !== false;
  const staleTimeMs = input.staleTimeMs ?? 0;

  const subscribe = useCallback((l: () => void) => cache.subscribe(stable, l), [cache, stable]);
  const getSnapshot = useCallback(() => cache.getSnapshot(stable), [cache, stable]);
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAP);

  // Effects only: nothing here runs during server render.
  useEffect(() => {
    return cache.observe({ ...stable, enabled, staleTimeMs });
  }, [cache, stable, enabled, staleTimeMs]);

  useEffect(() => {
    if (!live || !enabled) return;
    return cache.observeLive(stable);
  }, [cache, stable, live, enabled]);

  const refetch = useCallback(() => cache.refetch(stable), [cache, stable]);
  const setData = useCallback(
    (next: Row[] | null | ((prev: Row[] | null) => Row[] | null)) => cache.setData(stable, next),
    [cache, stable],
  );
  const mutate = useCallback(
    (updater: (prev: Row[] | null) => Row[] | null) => cache.setData(stable, updater),
    [cache, stable],
  );
  const invalidate = useCallback((t?: string) => cache.invalidate(t), [cache]);

  const hasData = snap.data !== null;
  // Before the first effect has run the entry is idle; present it as loading when enabled.
  const status = enabled && snap.status === "idle" && !hasData ? "loading" : snap.status;
  return {
    data: snap.data,
    error: snap.error,
    status,
    isLoading: !hasData && enabled && (status === "loading" || snap.isFetching),
    isFetching: snap.isFetching,
    refetch,
    setData,
    mutate,
    invalidate,
    liveState: snap.liveState,
    liveError: snap.liveError,
  };
}

/** Cached, de-duplicated, stale-while-revalidate query. */
export function useJordQuery(input: JordQueryInput): QueryResult {
  const { liveState: _s, liveError: _e, ...rest } = useQueryCore(input, false);
  return rest;
}

/** `useJordQuery` plus a realtime subscription merged into the cached list. */
export function useJordLive(input: JordQueryInput): LiveResult {
  return useQueryCore(input, true);
}
