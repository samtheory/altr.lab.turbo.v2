import type { JordError, RealtimeStateName } from "@altr/jord-client";

export type { JordError, RealtimeStateName };

/** Row shape used by the cache; deltas and snapshots carry plain objects. */
export type Row = Record<string, unknown>;

export interface JordResultLike {
  data: unknown;
  error: JordError | null;
}

/**
 * Structural view of a typed client: `createClient<DB>()` satisfies it.
 * Kept loose on purpose so one provider serves any generated `Database`.
 */
export interface JordClientLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: any): { select(columns?: any): PromiseLike<JordResultLike> };
}

export type OrderSpec = { column: string; ascending?: boolean };
export type FilterValue = string | number | boolean;

export interface JordQueryInput {
  /** `public.users` or `users`. */
  table: string;
  /** Select string (default `*`). Never put credentials here. */
  select?: string;
  /** Equality filters, ANDed. */
  filter?: Record<string, FilterValue>;
  order?: OrderSpec | OrderSpec[];
  limit?: number;
  /** Primary key columns for live merging (default `["id"]`; a snapshot's `pk` wins). */
  pk?: string[];
  enabled?: boolean;
  /** Data younger than this is not refetched on mount. Default 0. */
  staleTimeMs?: number;
}

export type QueryStatus = "idle" | "loading" | "success" | "error";

export interface QueryResult<T = Row[]> {
  data: T | null;
  error: JordError | null;
  status: QueryStatus;
  /** No data yet and a request is running. */
  isLoading: boolean;
  /** Any request (including background revalidation) is running. */
  isFetching: boolean;
  refetch: () => Promise<void>;
  /** Replace the cached list (optimistic update). Accepts a value or an updater. */
  setData: (next: T | null | ((prev: T | null) => T | null)) => void;
  mutate: (updater: (prev: T | null) => T | null) => void;
  /** Mark stale by query key or table name (default: every entry) and refetch observed ones. */
  invalidate: (target?: string) => void;
}

export interface LiveResult<T = Row[]> extends QueryResult<T> {
  liveState: RealtimeStateName;
  liveError: JordError | null;
}
