import { StrictMode, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Realtime, RealtimeChange, RealtimeSnapshot, SubscribeOptions } from "./test-types.js";
import { createRealtime } from "@altr/jord-client";
import { JordProvider, QueryCache, queryKey, useJordCache, useJordClient, useJordLive, useJordQuery } from "./index.js";
import { useJordContext } from "./provider.js";
import type { JordQueryInput } from "./index.js";

const SECRET = "sk_live_SUPER_SECRET_KEY";

type Row = Record<string, unknown>;

/** Stub typed client: records every request, resolves via manual `resolve()` or immediately. */
function stubClient(initial: Row[] = [{ id: 1, name: "a" }]) {
  const calls: Array<{ table: string; select: string; eq: Array<[string, unknown]>; order: unknown[]; limit?: number }> = [];
  const pending: Array<(r: { data: Row[] | null; error: unknown }) => void> = [];
  let manual = false;
  let rows = initial;
  const client = {
    from(table: string) {
      return {
        select(select = "*") {
          const call = { table, select, eq: [] as Array<[string, unknown]>, order: [] as unknown[], limit: undefined as number | undefined };
          calls.push(call);
          const q: any = {
            eq(c: string, v: unknown) { call.eq.push([c, v]); return q; },
            order(c: string, o: unknown) { call.order.push([c, o]); return q; },
            limit(n: number) { call.limit = n; return q; },
            then(ok: any, bad: any) {
              const p = manual
                ? new Promise<any>((res) => pending.push(res))
                : Promise.resolve({ data: rows, error: null });
              return p.then(ok, bad);
            },
          };
          return q;
        },
      };
    },
  };
  return {
    client,
    calls,
    setRows: (r: Row[]) => { rows = r; },
    manual: () => { manual = true; },
    resolve: async (data: Row[] | null, error: unknown = null) => {
      await act(async () => {
        // `await thenable` calls then() a microtask later: let a just-started request register.
        await Promise.resolve();
        await Promise.resolve();
        pending.shift()?.({ data, error });
      });
    },
    pendingCount: () => pending.length,
  };
}

function stubRealtime() {
  const subs: Array<{ opts: SubscribeOptions; live: boolean }> = [];
  const rt: Realtime = {
    subscribe(opts) {
      const s = { opts, live: true };
      subs.push(s);
      return { unsubscribe() { s.live = false; }, get state() { return "live" as const; } };
    },
    close() {},
  };
  const active = () => subs.filter((s) => s.live);
  const last = () => active()[active().length - 1]!;
  const change = (seq: number, op: string, row: Row | null, table = "public.items"): RealtimeChange => ({
    type: "jord.change", table, op, seq, row,
  });
  return { rt, subs, active, last, change };
}

const wrap = (client: unknown, realtime?: Realtime, extra: Record<string, unknown> = {}) =>
  function W({ children }: { children: ReactNode }) {
    return <JordProvider client={client as object} realtime={realtime} {...extra}>{children}</JordProvider>;
  };

function List({ q, id = "x", live = false }: { q: JordQueryInput; id?: string; live?: boolean }) {
  const r = live ? useJordLive(q) : useJordQuery(q);
  return (
    <div data-testid={id}>
      {r.isLoading ? "loading" : (r.data ?? []).map((x) => String(x.name)).join(",") || (r.error ? `err:${r.error.code}` : "empty")}
      {live ? `|${(r as ReturnType<typeof useJordLive>).liveState}` : ""}
      {r.isFetching ? "|fetching" : ""}
    </div>
  );
}
const text = (id = "x") => screen.getByTestId(id).textContent;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const Q: JordQueryInput = { table: "public.items", select: "*" };

beforeEach(() => { vi.useRealTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("useJordQuery", () => {
  it("shares the cache across components and dedups to one request", async () => {
    const s = stubClient();
    const W = wrap(s.client);
    render(<><List q={Q} id="a" /><List q={Q} id="b" /></>, { wrapper: W });
    await flush();
    expect(s.calls).toHaveLength(1);
    expect(text("a")).toBe("a");
    expect(text("b")).toBe("a");
  });

  it("applies filter/order/limit to the request and keys them stably", async () => {
    const s = stubClient();
    render(<List q={{ table: "items", filter: { b: 2, a: 1 }, order: { column: "id", ascending: false }, limit: 5 }} />, { wrapper: wrap(s.client) });
    await flush();
    expect(s.calls[0]).toMatchObject({ table: "items", eq: [["a", 1], ["b", 2]], order: [["id", { ascending: false }]], limit: 5 });
    expect(queryKey({ table: "t", filter: { a: 1, b: 2 } })).toBe(queryKey({ table: "t", filter: { b: 2, a: 1 } }));
  });

  it("refetch() runs a new request and updates data", async () => {
    const s = stubClient();
    let api!: ReturnType<typeof useJordQuery>;
    function C() { api = useJordQuery(Q); return <div data-testid="x">{(api.data ?? []).map((r) => String(r.name)).join(",")}</div>; }
    render(<C />, { wrapper: wrap(s.client) });
    await flush();
    s.setRows([{ id: 1, name: "z" }]);
    await act(async () => { await api.refetch(); });
    expect(s.calls).toHaveLength(2);
    expect(text()).toBe("z");
  });

  it("stale-while-revalidate: remount shows cached data while refetching", async () => {
    const s = stubClient();
    const W = wrap(s.client);
    function App({ show }: { show: boolean }) { return <W>{show ? <List q={Q} /> : <div />}</W>; }
    // keep provider alive across the child mount/unmount by using one wrapper tree
    function Host() {
      return <JordProvider client={s.client}><Toggle /></JordProvider>;
    }
    let setShow!: (v: boolean) => void;
    const React = await import("react");
    function Toggle() {
      const [show, set] = React.useState(true);
      setShow = set;
      return show ? <List q={Q} /> : <div data-testid="x">gone</div>;
    }
    void App;
    render(<Host />);
    await flush();
    expect(text()).toBe("a");
    await act(async () => setShow(false));
    s.manual();
    await act(async () => setShow(true));
    expect(text()).toBe("a|fetching"); // cached data served, revalidating
    await s.resolve([{ id: 1, name: "fresh" }]);
    expect(text()).toBe("fresh");
  });

  it("staleTimeMs skips refetch for fresh data", async () => {
    const s = stubClient();
    const q = { ...Q, staleTimeMs: 60_000 };
    const React = await import("react");
    let setShow!: (v: boolean) => void;
    function Toggle() {
      const [show, set] = React.useState(true);
      setShow = set;
      return show ? <List q={q} /> : <div data-testid="x">gone</div>;
    }
    render(<JordProvider client={s.client}><Toggle /></JordProvider>);
    await flush();
    await act(async () => setShow(false));
    await act(async () => setShow(true));
    await flush();
    expect(s.calls).toHaveLength(1);
  });

  it("ignores a superseded request when the key changes", async () => {
    const s = stubClient();
    s.manual();
    const { rerender } = render(<List q={{ table: "items", filter: { k: 1 } }} />, { wrapper: wrap(s.client) });
    await flush();
    rerender(<List q={{ table: "items", filter: { k: 2 } }} />);
    await flush();
    expect(s.pendingCount()).toBe(2);
    await s.resolve([{ id: 1, name: "one" }]); // first request (old key)
    expect(text()).toBe("loading|fetching"); // stale result for the old key must not leak in
    await s.resolve([{ id: 2, name: "two" }]);
    expect(text()).toBe("two");
  });

  it("does not set state or warn after unmount", async () => {
    const s = stubClient();
    s.manual();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<List q={Q} />, { wrapper: wrap(s.client) });
    await flush();
    unmount();
    await s.resolve([{ id: 1, name: "late" }]);
    expect(err).not.toHaveBeenCalled();
  });

  it("surfaces client errors as {status, code, message} only", async () => {
    const s = stubClient();
    s.manual();
    let r!: ReturnType<typeof useJordQuery>;
    function C() { r = useJordQuery(Q); return <div data-testid="x">{r.status}</div>; }
    render(<C />, { wrapper: wrap(s.client) });
    await flush();
    await s.resolve(null, { status: 403, code: "forbidden", message: "nope", extra: SECRET });
    expect(text()).toBe("error");
    expect(r.error).toEqual({ status: 403, code: "forbidden", message: "nope" });
  });

  it("enabled:false does not fetch", async () => {
    const s = stubClient();
    render(<List q={{ ...Q, enabled: false }} />, { wrapper: wrap(s.client) });
    await flush();
    expect(s.calls).toHaveLength(0);
  });

  it("useJordClient returns the provided client", () => {
    const s = stubClient();
    let got: unknown;
    function C() { got = useJordClient(); return null; }
    render(<C />, { wrapper: wrap(s.client) });
    expect(got).toBe(s.client);
  });

  it("setData/mutate update the cache optimistically (immutably)", async () => {
    const s = stubClient();
    let r!: ReturnType<typeof useJordQuery>;
    function C() { r = useJordQuery(Q); return <div data-testid="x">{(r.data ?? []).map((x) => String(x.name)).join(",")}</div>; }
    render(<C />, { wrapper: wrap(s.client) });
    await flush();
    const before = r.data;
    act(() => r.mutate((p) => [...(p ?? []), { id: 2, name: "b" }]));
    expect(text()).toBe("a,b");
    expect(before).toEqual([{ id: 1, name: "a" }]);
  });

  it("invalidate(table) refetches observed queries", async () => {
    const s = stubClient();
    let r!: ReturnType<typeof useJordQuery>;
    function C() { r = useJordQuery(Q); return null; }
    render(<C />, { wrapper: wrap(s.client) });
    await flush();
    await act(async () => { r.invalidate("items"); });
    expect(s.calls).toHaveLength(2);
  });

  it("StrictMode double effects send a single request", async () => {
    const s = stubClient();
    render(<StrictMode><List q={Q} /></StrictMode>, { wrapper: wrap(s.client) });
    await flush();
    expect(s.calls).toHaveLength(1);
    expect(text()).toBe("a");
  });
});

describe("cache internals", () => {
  it("never puts credentials in keys or state", async () => {
    const s = stubClient();
    const rt = stubRealtime();
    const cache = new QueryCache(s.client, rt.rt);
    const rel = cache.observe(Q);
    await flush();
    expect(JSON.stringify(cache.keys())).not.toContain(SECRET);
    expect(JSON.stringify(cache.getSnapshot(Q))).not.toContain(SECRET);
    rel();
  });

  it("evicts least recently used unobserved entries beyond maxEntries", () => {
    const s = stubClient();
    let t = 0;
    const cache = new QueryCache(s.client, undefined, { maxEntries: 3, now: () => ++t });
    for (let i = 0; i < 5; i++) cache.observe({ table: "items", limit: i + 1, enabled: false })();
    expect(cache.size).toBe(3);
    expect(cache.keys().some((k) => k.includes("[]," + "null"))).toBe(false);
    expect(cache.keys().map((k) => JSON.parse(k)[4])).toEqual([3, 4, 5]);
  });

  it("garbage-collects unobserved entries after gcTimeMs", async () => {
    vi.useFakeTimers();
    const s = stubClient();
    const cache = new QueryCache(s.client, undefined, { gcTimeMs: 1000 });
    const rel = cache.observe(Q);
    await vi.advanceTimersByTimeAsync(0);
    expect(cache.size).toBe(1);
    rel();
    await vi.advanceTimersByTimeAsync(999);
    expect(cache.size).toBe(1);
    await vi.advanceTimersByTimeAsync(2);
    expect(cache.size).toBe(0);
  });

  it("default gcTime is 5 minutes and re-observing cancels it", async () => {
    vi.useFakeTimers();
    const s = stubClient();
    const cache = new QueryCache(s.client, undefined);
    expect(cache.gcTimeMs).toBe(300_000);
    const rel = cache.observe(Q);
    rel();
    await vi.advanceTimersByTimeAsync(200_000);
    const rel2 = cache.observe(Q);
    await vi.advanceTimersByTimeAsync(400_000);
    expect(cache.size).toBe(1);
    rel2();
  });
});

describe("useJordLive", () => {
  const rows = [{ id: 1, name: "a" }, { id: 2, name: "b" }];

  async function mountLive(q: JordQueryInput = Q, strict = false) {
    const s = stubClient(rows);
    const rt = stubRealtime();
    let r!: ReturnType<typeof useJordLive>;
    function C() { r = useJordLive(q); return <div data-testid="x">{(r.data ?? []).map((x) => String(x.name)).join(",")}|{r.liveState}</div>; }
    const tree = <C />;
    render(strict ? <StrictMode>{tree}</StrictMode> : tree, { wrapper: wrap(s.client, rt.rt) });
    await flush();
    return { s, rt, get r() { return r; } };
  }

  it("subscribes on mount and unsubscribes on unmount", async () => {
    const s = stubClient(rows);
    const rt = stubRealtime();
    const { unmount } = render(<List q={Q} live />, { wrapper: wrap(s.client, rt.rt) });
    await flush();
    expect(rt.active()).toHaveLength(1);
    expect(rt.last().opts.table).toBe("public.items");
    unmount();
    expect(rt.active()).toHaveLength(0);
  });

  it("StrictMode double-mount leaves exactly one subscription", async () => {
    const { rt } = await mountLive(Q, true);
    expect(rt.active()).toHaveLength(1);
  });

  it("two components with the same query share one subscription", async () => {
    const s = stubClient(rows);
    const rt = stubRealtime();
    render(<><List q={Q} live id="a" /><List q={Q} live id="b" /></>, { wrapper: wrap(s.client, rt.rt) });
    await flush();
    expect(rt.active()).toHaveLength(1);
    expect(s.calls).toHaveLength(1);
  });

  it("resubscribes when the key changes", async () => {
    const s = stubClient(rows);
    const rt = stubRealtime();
    const { rerender } = render(<List q={{ table: "public.items", filter: { k: 1 } }} live />, { wrapper: wrap(s.client, rt.rt) });
    await flush();
    rerender(<List q={{ table: "public.items", filter: { k: 2 } }} live />);
    await flush();
    expect(rt.active()).toHaveLength(1);
    expect(rt.last().opts.filter).toEqual({ k: "2" });
  });

  it("merges insert/update/delete by primary key, immutably", async () => {
    const m = await mountLive();
    const before = m.r.data!;
    act(() => m.rt.last().opts.onChange(m.rt.change(1, "insert", { id: 3, name: "c" })));
    expect(screen.getByTestId("x").textContent).toBe("a,b,c|connecting");
    act(() => m.rt.last().opts.onChange(m.rt.change(2, "update", { id: 1, name: "A" })));
    expect(screen.getByTestId("x").textContent).toContain("A,b,c");
    act(() => m.rt.last().opts.onChange(m.rt.change(3, "delete", { id: 2 })));
    expect(screen.getByTestId("x").textContent).toContain("A,c");
    expect(before).toEqual(rows);
    expect(before[0]).toEqual({ id: 1, name: "a" });
    expect(m.s.calls).toHaveLength(1);
  });

  it("ignores duplicate seq and deltas for other tables", async () => {
    const m = await mountLive();
    act(() => m.rt.last().opts.onChange(m.rt.change(5, "insert", { id: 3, name: "c" })));
    act(() => m.rt.last().opts.onChange(m.rt.change(5, "insert", { id: 4, name: "d" })));
    act(() => m.rt.last().opts.onChange(m.rt.change(6, "insert", { id: 9, name: "z" }, "public.other")));
    expect(screen.getByTestId("x").textContent).toContain("a,b,c|");
    expect(screen.getByTestId("x").textContent).not.toContain("d");
    expect(screen.getByTestId("x").textContent).not.toContain("z");
  });

  it("insert of an existing PK updates instead of duplicating", async () => {
    const m = await mountLive();
    act(() => m.rt.last().opts.onChange(m.rt.change(1, "insert", { id: 1, name: "dup" })));
    expect(screen.getByTestId("x").textContent).toContain("dup,b|");
  });

  it("resync snapshot replaces the list and exposes liveState", async () => {
    const m = await mountLive();
    act(() => m.rt.last().opts.onState!({ state: "resync", at: 0 }));
    expect(m.r.liveState).toBe("resync");
    const snap: RealtimeSnapshot = { table: "public.items", rows: [{ id: 7, name: "new" }], pk: ["id"], cursor: 10, truncated: false, reason: "resync" };
    act(() => m.rt.last().opts.onSnapshot!(snap));
    act(() => m.rt.last().opts.onState!({ state: "live", at: 1 }));
    expect(screen.getByTestId("x").textContent).toBe("new|live");
    // deltas at or before the snapshot cursor are dropped
    act(() => m.rt.last().opts.onChange(m.rt.change(9, "insert", { id: 8, name: "old" })));
    expect(screen.getByTestId("x").textContent).toBe("new|live");
    act(() => m.rt.last().opts.onChange(m.rt.change(11, "insert", { id: 8, name: "next" })));
    expect(screen.getByTestId("x").textContent).toBe("new,next|live");
  });

  it("409 / resync_required error triggers a debounced refetch and surfaces the error", async () => {
    vi.useFakeTimers();
    const s = stubClient(rows);
    const rt = stubRealtime();
    let r!: ReturnType<typeof useJordLive>;
    function C() { r = useJordLive(Q); return null; }
    render(<C />, { wrapper: wrap(s.client, rt.rt) });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    act(() => rt.last().opts.onError!({ code: "resync_required", message: "gone", status: 409, retryable: true }));
    expect(r.liveError).toEqual({ status: 409, code: "resync_required", message: "gone" });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(s.calls).toHaveLength(2);
  });

  it("filtered/ordered/limited lists refetch (debounced 250ms) instead of merging", async () => {
    vi.useFakeTimers();
    const s = stubClient(rows);
    const rt = stubRealtime();
    function C() { useJordLive({ table: "public.items", order: { column: "id" }, limit: 10 }); return null; }
    render(<C />, { wrapper: wrap(s.client, rt.rt) });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(s.calls).toHaveLength(1);
    act(() => rt.last().opts.onChange(rt.change(1, "insert", { id: 3, name: "c" })));
    act(() => rt.last().opts.onChange(rt.change(2, "update", { id: 1, name: "q" })));
    await act(async () => { await vi.advanceTimersByTimeAsync(249); });
    expect(s.calls).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(2); });
    expect(s.calls).toHaveLength(2); // two deltas collapsed into one refetch
  });

  it("missing primary key falls back to refetch", async () => {
    vi.useFakeTimers();
    const s = stubClient(rows);
    const rt = stubRealtime();
    function C() { useJordLive(Q); return null; }
    render(<C />, { wrapper: wrap(s.client, rt.rt) });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    act(() => rt.last().opts.onChange(rt.change(1, "update", { name: "nopk" })));
    await act(async () => { await vi.advanceTimersByTimeAsync(260); });
    expect(s.calls).toHaveLength(2);
  });

  it("closes liveState after unmount-free key churn without leaking subscriptions", async () => {
    const s = stubClient(rows);
    const rt = stubRealtime();
    const { rerender, unmount } = render(<List q={{ table: "public.items", limit: 1 }} live />, { wrapper: wrap(s.client, rt.rt) });
    await flush();
    for (let i = 2; i < 6; i++) {
      rerender(<List q={{ table: "public.items", limit: i }} live />);
      await flush();
    }
    expect(rt.active()).toHaveLength(1);
    unmount();
    expect(rt.active()).toHaveLength(0);
  });
});

describe("SSR", () => {
  it("renders the loading state without window, fetching, or subscribing", () => {
    const s = stubClient();
    const rt = stubRealtime();
    const g = globalThis as { window?: unknown };
    const win = g.window;
    delete g.window; // simulate a server
    let html = "";
    try {
      html = renderToString(
        <JordProvider client={s.client} realtime={rt.rt}><List q={Q} live /></JordProvider>,
      );
    } finally {
      g.window = win;
    }
    expect(html).toContain("loading");
    expect(s.calls).toHaveLength(0);
    expect(rt.subs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Review fixes (S0089 follow-up)
// ---------------------------------------------------------------------------

function liveCache(rows: Row[] = [{ id: 1, name: "a" }, { id: 2, name: "b" }], q: JordQueryInput = Q) {
  const s = stubClient(rows);
  s.manual();
  const rt = stubRealtime();
  const cache = new QueryCache(s.client, rt.rt);
  const rel = cache.observe(q);
  const relLive = cache.observeLive(q);
  const names = () => (cache.getSnapshot(q).data ?? []).map((r) => String(r.name)).join(",");
  const emit = (c: RealtimeChange) => rt.last().opts.onChange(c);
  return { s, rt, cache, rel, relLive, names, emit, q };
}

describe("fix 1: live/fetch race (apply payload, then replay buffered deltas)", () => {
  it("a delete merged during a refetch stays deleted", async () => {
    vi.useFakeTimers();
    const m = liveCache();
    await m.s.resolve([{ id: 1, name: "a" }, { id: 2, name: "b" }]);
    void m.cache.refetch(m.q);
    m.emit(m.rt.change(1, "delete", { id: 2 }));
    expect(m.names()).toBe("a");
    await m.s.resolve([{ id: 1, name: "a" }, { id: 2, name: "b" }]); // read before the delete
    expect(m.names()).toBe("a");
    await vi.advanceTimersByTimeAsync(1000);
    expect(m.s.calls).toHaveLength(2); // no follow-up needed
  });

  it("an insert during the initial fetch is present afterwards", async () => {
    vi.useFakeTimers();
    const m = liveCache();
    m.emit(m.rt.change(1, "insert", { id: 3, name: "c" }));
    await m.s.resolve([{ id: 1, name: "a" }, { id: 2, name: "b" }]);
    expect(m.names()).toBe("a,b,c");
    await vi.advanceTimersByTimeAsync(1000);
    expect(m.s.calls).toHaveLength(1);
  });

  it("a snapshot that arrives while fetching wins over the later payload", async () => {
    const m = liveCache();
    m.rt.last().opts.onSnapshot!({ table: "public.items", rows: [{ id: 7, name: "snap" }], pk: ["id"], cursor: 5, truncated: false, reason: "initial" });
    expect(m.cache.getSnapshot(m.q).isFetching).toBe(false);
    await m.s.resolve([{ id: 1, name: "stale" }]);
    expect(m.names()).toBe("snap");
  });

  it("unmergeable deltas during a fetch cause at most one follow-up fetch", async () => {
    vi.useFakeTimers();
    const m = liveCache();
    await m.s.resolve([{ id: 1, name: "a" }]);
    void m.cache.refetch(m.q);
    m.emit(m.rt.change(1, "update", { name: "no-pk" }));
    m.emit(m.rt.change(2, "update", { name: "no-pk-2" }));
    await m.s.resolve([{ id: 1, name: "a" }]);
    await vi.advanceTimersByTimeAsync(300);
    expect(m.s.calls).toHaveLength(3);
    await m.s.resolve([{ id: 1, name: "fresh" }]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(m.s.calls).toHaveLength(3);
    expect(m.names()).toBe("fresh");
  });
});

describe("fix 2: identity scope and dispose", () => {
  it("changing scope drops the previous user's rows and fetches fresh", async () => {
    const s = stubClient([{ id: 1, name: "alice-row" }]);
    const { rerender } = render(<JordProvider client={s.client} scope="u1"><List q={Q} /></JordProvider>);
    await flush();
    expect(text()).toBe("alice-row");
    s.manual();
    rerender(<JordProvider client={s.client} scope="u2"><List q={Q} /></JordProvider>);
    await flush();
    expect(text()).not.toContain("alice-row");
    expect(s.calls).toHaveLength(2);
    await s.resolve([{ id: 9, name: "bob-row" }]);
    expect(text()).toBe("bob-row");
  });

  it("dispose clears every timer and unsubscribes live subscriptions", async () => {
    vi.useFakeTimers();
    const s = stubClient();
    const rt = stubRealtime();
    const cache = new QueryCache(s.client, rt.rt);
    const a = { ...Q, filter: { k: 1 } };
    cache.observe(a);
    cache.observeLive(a);
    cache.observe(Q)(); // unobserved -> gc timer
    await vi.advanceTimersByTimeAsync(0);
    rt.last().opts.onError!({ code: "resync_required", message: "x", status: 409, retryable: true }); // debounce timer
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    cache.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(rt.active()).toHaveLength(0);
    expect(cache.size).toBe(0);
  });

  it("unmounting the provider disposes its cache", async () => {
    const s = stubClient();
    let cache!: QueryCache;
    function Grab() { cache = useJordContext().cache; return null; }
    const { unmount } = render(<JordProvider client={s.client}><Grab /><List q={Q} /></JordProvider>);
    await flush();
    expect(cache.size).toBe(1);
    unmount();
    await flush();
    expect(cache.size).toBe(0);
  });

  it("useJordCache().clear() drops cached rows and refetches observed queries", async () => {
    const s = stubClient();
    let api!: ReturnType<typeof useJordCache>;
    function C() { api = useJordCache(); return <List q={Q} />; }
    render(<C />, { wrapper: wrap(s.client) });
    await flush();
    expect(text()).toBe("a");
    s.setRows([{ id: 2, name: "anon" }]);
    await act(async () => { api.clear(); });
    await flush();
    expect(text()).toBe("anon");
    expect(s.calls).toHaveLength(2);
  });
});

describe("fix 3/4: merge safety", () => {
  it("select without the pk refetches (debounced) instead of duplicating", async () => {
    vi.useFakeTimers();
    const q = { table: "public.items", select: "name" };
    const m = liveCache([{ name: "a" }], q);
    await m.s.resolve([{ name: "a" }]);
    m.emit(m.rt.change(1, "update", { id: 1, name: "A" }));
    m.emit(m.rt.change(2, "update", { id: 1, name: "A2" }));
    expect(m.names()).toBe("a");
    await vi.advanceTimersByTimeAsync(249);
    expect(m.s.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2);
    expect(m.s.calls).toHaveLength(2);
  });

  it("select including the pk merges in place, projecting away extra keys", async () => {
    const q = { table: "public.items", select: "id,name" };
    const m = liveCache([], q);
    await m.s.resolve([{ id: 1, name: "a" }]);
    m.emit(m.rt.change(1, "insert", { id: 2, name: "b", secret: SECRET }));
    m.emit(m.rt.change(2, "update", { id: 1, name: "A", secret: SECRET }));
    expect(m.cache.getSnapshot(q).data).toEqual([{ id: 1, name: "A" }, { id: 2, name: "b" }]);
  });

  it("filtered list: absent filter column refetches; null never matches; string 1 matches number 1", async () => {
    vi.useFakeTimers();
    const q = { table: "public.items", filter: { status: "open", n: 1 } };
    const m = liveCache([], q);
    await m.s.resolve([{ id: 1, name: "a", status: "open", n: 1 }]);
    m.emit(m.rt.change(1, "insert", { id: 2, name: "nostatus", n: 1 }));
    expect(m.names()).toBe("a");
    m.emit(m.rt.change(2, "update", { id: 1, name: "a", status: null, n: 1 }));
    expect(m.names()).toBe(""); // NULL does not equal 'open' -> removed
    m.emit(m.rt.change(3, "insert", { id: 3, name: "c", status: "open", n: "1" }));
    expect(m.names()).toBe("c");
    m.emit(m.rt.change(4, "insert", { id: 4, name: "d", status: "null", n: 1 }));
    expect(m.names()).toBe("c");
    await vi.advanceTimersByTimeAsync(260);
    expect(m.s.calls).toHaveLength(2); // the absent-column delta forced one refetch
  });
});

describe("fix 5/6: StrictMode and snapshot publication", () => {
  it("StrictMode double mount sends exactly one request (pending)", async () => {
    const s = stubClient();
    s.manual();
    render(<StrictMode><JordProvider client={s.client}><List q={Q} /></JordProvider></StrictMode>);
    await flush();
    expect(s.calls).toHaveLength(1);
    await s.resolve([{ id: 1, name: "one" }]);
    expect(text()).toBe("one");
  });

  it("releasing live publishes a new snapshot and notifies", () => {
    const s = stubClient();
    const rt = stubRealtime();
    const cache = new QueryCache(s.client, rt.rt);
    const seen: string[] = [];
    cache.subscribe(Q, () => seen.push(cache.getSnapshot(Q).liveState));
    const rel = cache.observeLive(Q);
    const before = cache.getSnapshot(Q);
    rel();
    expect(cache.getSnapshot(Q)).not.toBe(before);
    expect(seen.at(-1)).toBe("closed");
  });
});

describe("fix 7: hardening", () => {
  it("a throwing listener or updater is reported once and does not break others", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const s = stubClient();
    const cache = new QueryCache(s.client, undefined);
    let calls = 0;
    cache.subscribe(Q, () => { throw new Error(SECRET); });
    cache.subscribe(Q, () => { calls++; });
    cache.setData(Q, [{ id: 1 }]);
    cache.setData(Q, [{ id: 2 }]);
    expect(() => cache.setData(Q, () => { throw new Error(SECRET); })).not.toThrow();
    expect(calls).toBe(2);
    expect(err).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(err.mock.calls)).not.toContain(SECRET);
    expect(JSON.stringify(err.mock.calls)).not.toContain("items");
  });

  it("entries without observers are collected and drop() unsubscribes live", async () => {
    vi.useFakeTimers();
    const s = stubClient();
    const rt = stubRealtime();
    const cache = new QueryCache(s.client, rt.rt, { gcTimeMs: 1000 });
    cache.setData({ table: "a" }, [{ id: 1 }]);
    cache.observeLive({ table: "b" });
    expect(rt.active()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1001);
    expect(cache.size).toBe(0);
    expect(rt.active()).toHaveLength(0);
  });

  it("reads refresh LRU order; all-observed overflow warns once and evicts nothing", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const s = stubClient();
    let t = 0;
    const cache = new QueryCache(s.client, undefined, { maxEntries: 2, now: () => ++t });
    cache.setData({ table: "a" }, []);
    cache.setData({ table: "b" }, []);
    cache.getSnapshot({ table: "a" });
    cache.setData({ table: "c" }, []);
    expect(cache.keys().map((k) => JSON.parse(k)[0]).sort()).toEqual(["a", "c"]);

    const obs = new QueryCache(s.client, undefined, { maxEntries: 1 });
    obs.observe({ table: "x", enabled: false });
    obs.observe({ table: "y", enabled: false });
    obs.observe({ table: "z", enabled: false });
    expect(obs.size).toBe(3);
    expect(err).toHaveBeenCalledTimes(1);
  });
});

describe("fix 8: liveError redaction comes from the realtime client", () => {
  it("a key echoed in a server error never reaches liveError", async () => {
    const sockets: Array<{ onmessage: ((ev: { data: unknown }) => void) | null }> = [];
    class FakeWS {
      onopen = null;
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      onclose = null;
      onerror = null;
      constructor(public url: string) { sockets.push(this); }
      send() {}
      close() {}
    }
    const realtime = createRealtime({ url: "http://jord.test", project: "p", key: SECRET, WebSocket: FakeWS as never });
    const s = stubClient();
    let r!: ReturnType<typeof useJordLive>;
    function C() { r = useJordLive(Q); return null; }
    render(<C />, { wrapper: wrap(s.client, realtime) });
    await flush();
    expect(sockets).toHaveLength(1);
    act(() => sockets[0]!.onmessage!({ data: JSON.stringify({ type: "error", status: 400, error: "bad_request", message: `rejected key ${SECRET}` }) }));
    expect(r.liveError?.message).toBe("rejected key [redacted]");
    expect(JSON.stringify(r.liveError)).not.toContain(SECRET);
    realtime.close();
  });
});
