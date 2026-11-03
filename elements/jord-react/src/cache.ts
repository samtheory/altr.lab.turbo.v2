import type {
  Realtime,
  RealtimeChange,
  RealtimeError,
  RealtimeSnapshot,
  RealtimeStateEvent,
  RealtimeStateName,
} from "@altr/jord-client";
import type {
  FilterValue,
  JordClientLike,
  JordError,
  JordQueryInput,
  JordResultLike,
  OrderSpec,
  QueryStatus,
  Row,
} from "./types.js";

export const DEFAULT_GC_MS = 5 * 60_000;
export const DEFAULT_MAX_ENTRIES = 100;
export const REFETCH_DEBOUNCE_MS = 250;
/** Deltas buffered per in-flight fetch; beyond this the payload is followed by one refetch. */
const MAX_PENDING_DELTAS = 1000;

export interface EntrySnapshot {
  data: Row[] | null;
  error: JordError | null;
  status: QueryStatus;
  isFetching: boolean;
  liveState: RealtimeStateName;
  liveError: JordError | null;
}

interface Descriptor {
  table: string;
  select: string;
  filter: Record<string, FilterValue>;
  order: OrderSpec[];
  limit: number | null;
  pk: string[];
}

interface LiveState {
  refs: number;
  sub: { unsubscribe(): void } | null;
  lastSeq: number;
}

interface Entry {
  key: string;
  desc: Descriptor;
  snap: EntrySnapshot;
  listeners: Set<() => void>;
  observers: number;
  updatedAt: number;
  token: object | null;
  /** Deltas received while `token` (a fetch) is in flight; replayed onto its payload. */
  pending: RealtimeChange[];
  /** `pending` overflowed: the payload is applied and followed by one refetch. */
  overflow: boolean;
  gcTimer: ReturnType<typeof setTimeout> | null;
  refetchTimer: ReturnType<typeof setTimeout> | null;
  lastTouched: number;
  live: LiveState | null;
}

export interface CacheOptions {
  gcTimeMs?: number;
  maxEntries?: number;
  now?: () => number;
}

const stripPublic = (t: string) => (t.startsWith("public.") ? t.slice(7) : t);

function normalizeOrder(o: JordQueryInput["order"]): OrderSpec[] {
  if (!o) return [];
  return (Array.isArray(o) ? o : [o]).map((x) => ({
    column: x.column,
    ascending: x.ascending !== false,
  }));
}

function describe(q: JordQueryInput): Descriptor {
  return {
    table: q.table,
    select: q.select?.trim() || "*",
    filter: Object.fromEntries(Object.entries(q.filter ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    order: normalizeOrder(q.order),
    limit: q.limit ?? null,
    pk: q.pk && q.pk.length > 0 ? [...q.pk] : ["id"],
  };
}

/** Stable serialization (sorted filter keys, normalized order). Takes no credentials, so none can leak in. */
export function queryKey(q: JordQueryInput): string {
  const d = describe(q);
  const filter = Object.keys(d.filter)
    .sort()
    .map((k) => [k, d.filter[k]]);
  return JSON.stringify([
    stripPublic(d.table),
    d.select,
    filter,
    d.order.map((o) => [o.column, o.ascending]),
    d.limit,
    d.pk,
  ]);
}

function toError(e: unknown): JordError {
  const o = (e ?? {}) as Partial<JordError>;
  return {
    status: typeof o.status === "number" ? o.status : 0,
    code: typeof o.code === "string" ? o.code : "network_error",
    message: typeof o.message === "string" ? o.message : "Request failed",
  };
}

const EMPTY_SNAP: EntrySnapshot = {
  data: null,
  error: null,
  status: "idle",
  isFetching: false,
  liveState: "closed",
  liveError: null,
};

/** Mergeable selects: `*` (full rows) or a plain column list. Embeds/aliases force a refetch. */
function mergeProjection(select: string): string[] | "*" | null {
  if (select === "*") return "*";
  if (/[()!:]/.test(select) || select.includes("*")) return null;
  const cols = select
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return cols.length > 0 ? cols : null;
}

/** Copy of `row` restricted to the selected columns (never carries extra keys into the cache). */
function project(row: Row, p: string[] | "*"): Row {
  if (p === "*") return { ...row };
  const out: Row = {};
  for (const c of p) if (Object.prototype.hasOwnProperty.call(row, c)) out[c] = row[c];
  return out;
}

const asNumber = (x: unknown): number =>
  typeof x === "boolean" ? (x ? 1 : 0) : typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN;

/**
 * Equality-filter test for one delta column. `null` = cannot decide (column absent or
 * non-scalar) and the caller must refetch. SQL `col = v` never matches NULL.
 */
function filterMatch(rv: unknown, v: FilterValue): boolean | null {
  if (rv === undefined) return null;
  if (rv === null) return false;
  if (typeof rv === typeof v) return rv === v;
  if (typeof rv === "boolean" || typeof v === "boolean") {
    if (typeof rv === "object") return null;
    return asNumber(rv) === asNumber(v);
  }
  if (typeof rv === "number" || typeof rv === "string") return String(rv) === String(v);
  return null;
}

const REFETCH = Symbol("refetch");

/**
 * Pure delta merge. Returns the next list (same reference when unchanged) or REFETCH
 * when the delta cannot be merged safely in place.
 */
function mergeDelta(d: Descriptor, data: Row[], c: RealtimeChange): Row[] | typeof REFETCH {
  const proj = mergeProjection(d.select);
  if (!proj || d.order.length > 0 || d.limit !== null) return REFETCH;
  // Without every PK column in the projection rows cannot be identified (dupes / no-op deletes).
  if (proj !== "*" && !d.pk.every((k) => proj.includes(k))) return REFETCH;
  const row = c.row;
  if (!row || typeof row !== "object") return REFETCH;
  if (!d.pk.every((k) => row[k] !== undefined && row[k] !== null)) return REFETCH;
  const same = (r: Row) => d.pk.every((k) => r[k] === row[k]);
  if (c.op === "delete") {
    return data.some(same) ? data.filter((r) => !same(r)) : data;
  }
  if (c.op !== "insert" && c.op !== "update" && c.op !== "upsert") return REFETCH;
  let matches = true;
  for (const [k, v] of Object.entries(d.filter)) {
    const m = filterMatch(row[k], v);
    if (m === null) return REFETCH;
    if (!m) matches = false;
  }
  const idx = data.findIndex(same);
  if (!matches) return idx >= 0 ? data.filter((r) => !same(r)) : data;
  const projected = project(row, proj);
  if (idx >= 0) return data.map((r, i) => (i === idx ? { ...r, ...projected } : r));
  return [...data, projected];
}

type AnyQuery = {
  eq(c: string, v: unknown): AnyQuery;
  order(c: string, o?: { ascending?: boolean }): AnyQuery;
  limit(n: number): AnyQuery;
} & PromiseLike<JordResultLike>;

const defer: (fn: () => void) => void =
  typeof queueMicrotask === "function" ? queueMicrotask : (fn) => void Promise.resolve().then(fn);

export class QueryCache {
  readonly gcTimeMs: number;
  readonly maxEntries: number;
  private readonly now: () => number;
  private readonly entries = new Map<string, Entry>();
  private reportedListenerError = false;
  private warnedFull = false;
  private owners = 0;

  constructor(
    private readonly client: JordClientLike,
    private readonly realtime: Realtime | undefined,
    opts: CacheOptions = {},
  ) {
    this.gcTimeMs = opts.gcTimeMs ?? DEFAULT_GC_MS;
    this.maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.now = opts.now ?? Date.now;
  }

  get size(): number {
    return this.entries.size;
  }
  keys(): string[] {
    return [...this.entries.keys()];
  }
  hasRealtime(): boolean {
    return !!this.realtime;
  }

  private entry(q: JordQueryInput): Entry {
    const key = queryKey(q);
    let e = this.entries.get(key);
    if (!e) {
      e = {
        key,
        desc: describe(q),
        snap: EMPTY_SNAP,
        listeners: new Set(),
        observers: 0,
        updatedAt: 0,
        token: null,
        pending: [],
        overflow: false,
        gcTimer: null,
        refetchTimer: null,
        lastTouched: 0,
        live: null,
      };
      this.entries.set(key, e);
      this.armGc(e); // created by subscribe/setData/refetch without an observer: still collectable
    }
    e.lastTouched = this.now();
    this.evict(e);
    return e;
  }

  private armGc(e: Entry): void {
    if (e.gcTimer) clearTimeout(e.gcTimer);
    e.gcTimer = setTimeout(() => {
      e.gcTimer = null;
      if (e.observers === 0 && this.entries.get(e.key) === e) this.drop(e);
    }, this.gcTimeMs);
  }

  /** LRU: drop least recently touched UNOBSERVED entries beyond the bound; never evicts observed. */
  private evict(keep: Entry): void {
    while (this.entries.size > this.maxEntries) {
      let victim: Entry | null = null;
      for (const e of this.entries.values()) {
        if (e === keep || e.observers > 0) continue;
        if (!victim || e.lastTouched < victim.lastTouched) victim = e;
      }
      if (!victim) {
        if (!this.warnedFull) {
          this.warnedFull = true;
          console.error(
            `[jord-react] cache holds more than maxEntries (${this.maxEntries}) observed queries; nothing evictable`,
          );
        }
        return;
      }
      this.drop(victim);
    }
  }

  private stopLive(e: Entry): void {
    const live = e.live;
    if (!live) return;
    e.live = null;
    live.refs = 0;
    try {
      live.sub?.unsubscribe();
    } catch {
      /* ignore */
    }
    live.sub = null;
  }

  private drop(e: Entry): void {
    if (e.gcTimer) clearTimeout(e.gcTimer);
    if (e.refetchTimer) clearTimeout(e.refetchTimer);
    e.gcTimer = e.refetchTimer = null;
    e.token = null;
    e.pending = [];
    this.stopLive(e);
    if (this.entries.get(e.key) === e) this.entries.delete(e.key);
  }

  private reportError(what: string): void {
    if (this.reportedListenerError) return;
    this.reportedListenerError = true;
    // Fixed text only: never the query key, row data, error text or any credential.
    console.error(`[jord-react] ${what} threw; continuing (further errors suppressed)`);
  }

  /** Publish a new immutable snapshot and notify every listener (each one guarded). */
  private set(e: Entry, patch: Partial<EntrySnapshot>): void {
    e.snap = { ...e.snap, ...patch };
    for (const l of [...e.listeners]) {
      try {
        l();
      } catch {
        this.reportError("a cache listener");
      }
    }
  }

  /** Stable snapshot for useSyncExternalStore (same object until something changes). */
  getSnapshot(q: JordQueryInput): EntrySnapshot {
    const e = this.entries.get(queryKey(q));
    if (!e) return EMPTY_SNAP;
    e.lastTouched = this.now();
    return e.snap;
  }

  subscribe(q: JordQueryInput, listener: () => void): () => void {
    const e = this.entry(q);
    e.listeners.add(listener);
    return () => {
      e.listeners.delete(listener);
    };
  }

  /**
   * Mark observed; fetch when enabled and missing/stale. Returns release.
   * Teardown after the last release is deferred one microtask, so a StrictMode
   * unmount/mount pair keeps the in-flight request (exactly one request is sent).
   */
  observe(q: JordQueryInput): () => void {
    const e = this.entry(q);
    e.observers++;
    if (e.gcTimer) clearTimeout(e.gcTimer);
    e.gcTimer = null;
    if (q.enabled !== false) {
      const stale = e.snap.data === null || this.now() - e.updatedAt >= (q.staleTimeMs ?? 0);
      if (stale && !e.token) void this.fetch(e);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      e.observers = Math.max(0, e.observers - 1);
      if (e.observers > 0) return;
      defer(() => {
        if (e.observers > 0 || this.entries.get(e.key) !== e) return;
        if (e.refetchTimer) clearTimeout(e.refetchTimer);
        e.refetchTimer = null;
        e.token = null; // nobody is watching: ignore any in-flight result
        e.pending = [];
        e.overflow = false;
        if (e.snap.isFetching) {
          this.set(e, {
            isFetching: false,
            status: e.snap.data ? "success" : e.snap.error ? "error" : "idle",
          });
        }
        this.armGc(e);
      });
    };
  }

  refetch(q: JordQueryInput): Promise<void> {
    return this.fetch(this.entry(q));
  }

  /**
   * Live/fetch race strategy: APPLY THE PAYLOAD, THEN REPLAY. Deltas that arrive while a
   * fetch is in flight are applied to the visible list (when there is one) and also
   * buffered on the entry. When the fetch resolves, its payload becomes the base and the
   * buffered deltas are replayed in arrival (seq) order. A fetch carries no cursor, so
   * every buffered delta is replayed; full-row upsert / delete-by-PK replay is idempotent
   * and converges, so a delete merged mid-fetch stays deleted and an insert is kept. If a
   * buffered delta cannot be merged (or the buffer overflowed) the payload is applied and
   * ONE debounced follow-up refetch is scheduled. A replaceable realtime snapshot that
   * arrives mid-fetch supersedes the fetch token outright.
   */
  private async fetch(e: Entry): Promise<void> {
    const token = {};
    e.token = token; // supersedes any earlier request for this key (buffer is kept)
    this.set(e, { isFetching: true, status: e.snap.data ? "success" : "loading" });
    let result: JordResultLike;
    try {
      const d = e.desc;
      let qb = this.client.from(d.table).select(d.select) as unknown as AnyQuery;
      for (const [k, v] of Object.entries(d.filter)) qb = qb.eq(k, v);
      for (const o of d.order) qb = qb.order(o.column, { ascending: o.ascending });
      if (d.limit !== null) qb = qb.limit(d.limit);
      result = await qb;
    } catch (err) {
      result = { data: null, error: toError(err) };
    }
    if (e.token !== token || this.entries.get(e.key) !== e) return; // superseded, unobserved, evicted, disposed
    e.token = null;
    const pending = e.pending;
    const overflow = e.overflow;
    e.pending = [];
    e.overflow = false;
    if (result.error) {
      this.set(e, { isFetching: false, error: toError(result.error), status: "error" });
      return;
    }
    let data: Row[] = Array.isArray(result.data) ? (result.data as Row[]) : [];
    let followUp = overflow;
    if (!overflow) {
      for (const c of pending) {
        const next = mergeDelta(e.desc, data, c);
        if (next === REFETCH) {
          followUp = true;
          break;
        }
        data = next;
      }
    }
    e.updatedAt = this.now();
    this.set(e, { isFetching: false, error: null, status: "success", data });
    if (followUp) this.scheduleRefetch(e);
  }

  setData(q: JordQueryInput, next: Row[] | null | ((prev: Row[] | null) => Row[] | null)): void {
    const e = this.entry(q);
    let data: Row[] | null;
    try {
      data = typeof next === "function" ? next(e.snap.data) : next;
    } catch {
      this.reportError("a setData/mutate updater");
      return;
    }
    e.updatedAt = this.now();
    this.set(e, { data, status: data ? "success" : e.snap.status, error: null });
  }

  /** `target`: exact query key or table name; omitted = all entries. Observed entries refetch now. */
  invalidate(target?: string): void {
    for (const e of [...this.entries.values()]) {
      if (
        target !== undefined &&
        e.key !== target &&
        stripPublic(e.desc.table) !== stripPublic(target)
      ) {
        continue;
      }
      e.updatedAt = 0;
      if (e.observers > 0) void this.fetch(e);
    }
  }

  /**
   * Drop every cached row (e.g. on sign-out). Unobserved, unlistened entries are removed;
   * the rest are reset to empty and observed ones refetch with the client's current
   * credentials. Live subscriptions stay attached to mounted hooks.
   */
  clear(): void {
    for (const e of [...this.entries.values()]) {
      if (e.observers === 0 && e.listeners.size === 0) {
        this.drop(e);
        continue;
      }
      if (e.refetchTimer) clearTimeout(e.refetchTimer);
      e.refetchTimer = null;
      e.token = null;
      e.pending = [];
      e.overflow = false;
      e.updatedAt = 0;
      this.set(e, { data: null, error: null, status: "idle", isFetching: false, liveError: null });
      if (e.observers > 0) void this.fetch(e);
    }
  }

  /**
   * Tear down: clears every gc/debounce timer, unsubscribes every live subscription,
   * ignores in-flight results and drops all entries. Safe to call more than once.
   */
  dispose(): void {
    for (const e of [...this.entries.values()]) {
      this.drop(e);
      e.listeners.clear();
    }
    this.entries.clear();
  }

  /** @internal Provider ownership: dispose one microtask after the last owner leaves. */
  retainOwner(): () => void {
    this.owners++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.owners--;
      defer(() => {
        if (this.owners === 0) this.dispose();
      });
    };
  }

  private scheduleRefetch(e: Entry): void {
    if (e.refetchTimer) clearTimeout(e.refetchTimer);
    e.refetchTimer = setTimeout(() => {
      e.refetchTimer = null;
      if (e.observers > 0 && this.entries.get(e.key) === e) void this.fetch(e);
    }, REFETCH_DEBOUNCE_MS);
  }

  // ---------------- live ----------------

  /** Ref-counted subscription shared per query key. Returns release. */
  observeLive(q: JordQueryInput): () => void {
    if (!this.realtime) return () => {};
    const e = this.entry(q);
    if (!e.live) e.live = { refs: 0, sub: null, lastSeq: -1 };
    const live = e.live;
    live.refs++;
    if (live.refs === 1 && !live.sub) {
      live.lastSeq = -1;
      this.set(e, { liveState: "connecting", liveError: null });
      const d = e.desc;
      const filter: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.filter)) filter[k] = String(v);
      // Error redaction (key / token) is the realtime client's job: `onError` text arrives redacted.
      live.sub = this.realtime.subscribe({
        table: d.table,
        ...(Object.keys(filter).length ? { filter } : {}),
        onChange: (c) => this.onChange(e, live, c),
        onSnapshot: (s) => this.onSnapshot(e, live, s),
        onState: (ev: RealtimeStateEvent) => {
          if (e.live === live) this.set(e, { liveState: ev.state });
        },
        onError: (err: RealtimeError) => {
          if (e.live !== live) return;
          this.set(e, {
            liveError: { status: err.status ?? 0, code: err.code, message: err.message },
          });
          if (err.status === 409 || err.status === 410 || err.code === "resync_required") {
            this.scheduleRefetch(e);
          }
        },
      });
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      live.refs--;
      if (live.refs <= 0) {
        live.refs = 0;
        try {
          live.sub?.unsubscribe();
        } catch {
          /* ignore */
        }
        live.sub = null;
        if (e.live === live) {
          e.live = null;
          this.set(e, { liveState: "closed" });
        }
      }
    };
  }

  private onChange(e: Entry, live: LiveState, c: RealtimeChange): void {
    if (e.live !== live || e.observers === 0 || this.entries.get(e.key) !== e) return;
    if (stripPublic(c.table) !== stripPublic(e.desc.table)) return;
    if (typeof c.seq === "number") {
      if (c.seq <= live.lastSeq) return; // duplicate / replay
      live.lastSeq = c.seq;
    }
    if (e.token) {
      // Fetch in flight: buffer for replay onto its payload (see `fetch`).
      if (e.pending.length < MAX_PENDING_DELTAS) e.pending.push(c);
      else e.overflow = true;
    }
    const data = e.snap.data;
    if (!data) {
      if (!e.token) this.scheduleRefetch(e); // the in-flight fetch + replay covers it otherwise
      return;
    }
    const next = mergeDelta(e.desc, data, c);
    if (next === REFETCH) {
      this.scheduleRefetch(e);
      return;
    }
    if (next === data) return;
    e.updatedAt = this.now();
    this.set(e, { data: next });
  }

  private onSnapshot(e: Entry, live: LiveState, s: RealtimeSnapshot): void {
    if (e.live !== live || e.observers === 0 || this.entries.get(e.key) !== e) return;
    if (typeof s.cursor === "number") live.lastSeq = s.cursor;
    const d = e.desc;
    const canReplace =
      d.order.length === 0 &&
      d.limit === null &&
      mergeProjection(d.select) === "*" &&
      !s.truncated &&
      Array.isArray(s.rows);
    if (canReplace) {
      if (Array.isArray(s.pk) && s.pk.length > 0) d.pk = [...s.pk];
      // The snapshot is newer than any in-flight fetch: supersede it and drop its buffer.
      e.token = null;
      e.pending = [];
      e.overflow = false;
      e.updatedAt = this.now();
      this.set(e, {
        data: s.rows.map((r) => ({ ...r })),
        status: "success",
        error: null,
        isFetching: false,
      });
    } else if (s.reason !== "initial") {
      this.scheduleRefetch(e);
    }
  }
}
