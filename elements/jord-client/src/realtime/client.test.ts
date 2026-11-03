import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { backoffCeiling, createRealtime } from "./client.js";
import type {
  RealtimeChange,
  RealtimeError,
  RealtimeOptions,
  RealtimeSnapshot,
  RealtimeStateEvent,
  WebSocketCtor,
} from "./client.js";

const KEY = "pk_live_supersecretkey123";

class FakeWS {
  static all: FakeWS[] = [];
  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: ((e: { code: number; reason?: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  sent: Array<Record<string, unknown>> = [];
  closedByClient = false;
  constructor(
    public url: string,
    public opts?: unknown,
  ) {
    FakeWS.all.push(this);
  }
  send(d: string) {
    this.sent.push(JSON.parse(d) as Record<string, unknown>);
  }
  close() {
    this.closedByClient = true;
  }
  // server side helpers
  push(frame: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  drop(code = 1006, reason = "") {
    this.onclose?.({ code, reason });
  }
}
const last = () => FakeWS.all[FakeWS.all.length - 1]!;
const change = (seq: number, id = String(seq)) => ({ type: "jord.change", table: "t", op: "insert", seq, row: { id } });

function harness(extra: Partial<RealtimeOptions> = {}, random = () => 0.999) {
  const states: RealtimeStateEvent[] = [];
  const changes: RealtimeChange[] = [];
  const snaps: RealtimeSnapshot[] = [];
  const errors: RealtimeError[] = [];
  const log: string[] = [];
  const rt = createRealtime({
    url: "https://x.test",
    project: "shop",
    key: KEY,
    WebSocket: FakeWS as unknown as WebSocketCtor,
    random,
    ...extra,
  });
  const sub = rt.subscribe({
    table: "t",
    onChange: (c) => {
      changes.push(c);
      log.push(`c${c.seq}`);
    },
    onState: (s) => {
      states.push(s);
      log.push(`s:${s.state}`);
    },
    onSnapshot: (s) => {
      snaps.push(s);
      log.push("snap");
    },
    onError: (e) => errors.push(e),
  });
  return { rt, sub, states, changes, snaps, errors, log };
}

function liveFirst() {
  const w = last();
  w.push({ type: "ready" });
  w.push({ type: "snapshot", table: "t", pk: ["id"], rows: [], cursor: 4, truncated: false });
  return w;
}

beforeEach(() => {
  FakeWS.all = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("realtime reconnect/resume", () => {
  it("drop mid-stream then resume: no duplicates, no lost deltas", async () => {
    const h = harness();
    const w1 = liveFirst();
    expect(w1.sent[0]).toEqual({ type: "subscribe", table: "t" });
    for (const s of [5, 6, 7]) w1.push(change(s));
    w1.drop(1006);
    expect(h.sub.state).toBe("degraded");
    await vi.advanceTimersByTimeAsync(600);
    const w2 = last();
    expect(w2).not.toBe(w1);
    w2.push({ type: "ready" });
    expect(w2.sent[0]).toEqual({ type: "subscribe", table: "t", since: 7 });
    w2.push({ type: "subscribed", table: "t", cursor: 7 });
    for (const s of [6, 7, 8, 9, 10]) w2.push(change(s)); // replay 6..9 incl. dupes
    expect(h.changes.map((c) => c.seq)).toEqual([5, 6, 7, 8, 9, 10]);
    expect(h.snaps).toHaveLength(1);
    expect(h.sub.state).toBe("live");
    h.rt.close();
  });

  it("filtered gaps in seq are not loss", () => {
    const h = harness();
    const w = liveFirst();
    w.push(change(5));
    w.push(change(40));
    expect(h.changes.map((c) => c.seq)).toEqual([5, 40]);
    expect(h.states.some((s) => s.state === "resync")).toBe(false);
    h.rt.close();
  });

  it("cursor past retention (409) -> resync, snapshot before any delta", () => {
    const h = harness({}, () => 0);
    const w = liveFirst();
    w.push(change(5));
    // simulate a reconnect with a stale cursor
    w.drop(1006);
    vi.advanceTimersByTime(1000);
    const w2 = last();
    w2.push({ type: "ready" });
    expect(w2.sent[0]).toMatchObject({ since: 5 });
    w2.push({ type: "error", status: 409, error: "resync_required" });
    expect(h.sub.state).toBe("resync");
    expect(w2.sent[1]).toEqual({ type: "subscribe", table: "t" });
    w2.push(change(99)); // must not be emitted before the snapshot
    w2.push({ type: "snapshot", table: "t", pk: ["id"], rows: [{ id: "a" }], cursor: 50, truncated: false });
    w2.push(change(51));
    expect(h.log.slice(-4)).toEqual(["s:resync", "s:live", "snap", "c51"]);
    expect(h.snaps.at(-1)).toMatchObject({ reason: "resync", cursor: 50 });
    expect(h.changes.map((c) => c.seq)).toEqual([5, 51]);
    expect(h.errors).toHaveLength(0);
    h.rt.close();
  });

  it("server resync frame resubscribes without since", () => {
    const h = harness();
    const w = liveFirst();
    w.push(change(5));
    w.push({ type: "resync", table: "t", seq: 6, error: "resync_required" });
    expect(w.sent.at(-1)).toEqual({ type: "subscribe", table: "t" });
    w.push({ type: "snapshot", table: "t", pk: ["id"], rows: [], cursor: 20, truncated: false });
    w.push(change(21));
    expect(h.changes.map((c) => c.seq)).toEqual([5, 21]);
    h.rt.close();
  });

  it("500 error frame is retryable (not resync)", async () => {
    const h = harness();
    const w = last();
    w.push({ type: "ready" });
    w.push({ type: "error", status: 500, error: "snapshot_failed" });
    expect(h.states.at(-1)).toMatchObject({ state: "degraded" });
    expect(h.errors[0]).toMatchObject({ retryable: true, status: 500 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWS.all).toHaveLength(2);
    h.rt.close();
  });
});

describe("backoff, heartbeat, close codes", () => {
  it("backoff is jittered within [0, min(cap, base*2^n)] and bounded", () => {
    expect(backoffCeiling(0)).toBe(500);
    expect(backoffCeiling(3)).toBe(4000);
    expect(backoffCeiling(50)).toBe(30_000);
    const delays: number[] = [];
    const h = harness({}, () => 0.5);
    h.sub; // eslint-disable-line @typescript-eslint/no-unused-expressions
    for (let i = 0; i < 12; i++) {
      last().drop(1006);
      delays.push(h.states.at(-1)!.delayMs!);
      vi.advanceTimersByTime(30_000);
    }
    delays.forEach((d, n) => {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(backoffCeiling(n));
      expect(d).toBe(Math.floor(0.5 * backoffCeiling(n)));
    });
    expect(Math.max(...delays)).toBeLessThanOrEqual(30_000);
    h.rt.close();
  });

  it("heartbeat timeout triggers reconnect; messages re-arm it", async () => {
    const h = harness({ heartbeatTimeoutMs: 1000 }, () => 0.5);
    const w = liveFirst();
    await vi.advanceTimersByTimeAsync(800);
    w.push({ type: "ping" });
    expect(w.sent.at(-1)).toEqual({ type: "pong" });
    await vi.advanceTimersByTimeAsync(800);
    expect(h.sub.state).toBe("live");
    await vi.advanceTimersByTimeAsync(300);
    expect(h.states.at(-1)).toMatchObject({ state: "degraded", reason: "heartbeat_timeout" });
    await vi.advanceTimersByTimeAsync(300);
    expect(FakeWS.all).toHaveLength(2);
    h.rt.close();
  });

  it.each([4410, 4403])("terminal close %i does not reconnect", async (code) => {
    const h = harness();
    liveFirst().drop(code, "nope");
    expect(h.sub.state).toBe("closed");
    await vi.advanceTimersByTimeAsync(120_000);
    expect(FakeWS.all).toHaveLength(1);
    expect(h.errors[0]).toMatchObject({ retryable: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("4401 calls refreshToken once, then terminal", async () => {
    const refreshToken = vi.fn(async () => "new-token");
    const h = harness({ refreshToken, token: "old" });
    liveFirst().drop(4401, "token_expired");
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(h.states.at(-1)).toMatchObject({ state: "degraded", reason: "token_refreshed" });
    expect(FakeWS.all).toHaveLength(1); // goes through backoff, not instant
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWS.all).toHaveLength(2);
    expect(last().opts).toMatchObject({ headers: { authorization: "Bearer new-token", "x-jord-key": KEY } });
    last().drop(4401, "token_expired"); // refresh did not help
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(h.sub.state).toBe("closed");
    expect(FakeWS.all).toHaveLength(2);
  });

  it("4401 without refreshToken is terminal", () => {
    const h = harness();
    liveFirst().drop(4401, "unauthorized");
    expect(h.states.at(-1)).toMatchObject({ state: "closed", reason: "unauthorized", code: 4401 });
  });

  it("4429 backs off at least 5 s; 1009/1013 reconnect", async () => {
    const h = harness({}, () => 0);
    liveFirst().drop(4429);
    expect(h.states.at(-1)!.delayMs).toBeGreaterThanOrEqual(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(FakeWS.all).toHaveLength(2);
    last().drop(1013);
    last; // eslint-disable-line @typescript-eslint/no-unused-expressions
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWS.all).toHaveLength(3);
    last().drop(1009);
    await vi.advanceTimersByTimeAsync(5000);
    expect(FakeWS.all).toHaveLength(4);
    h.rt.close();
  });
});

describe("lifecycle + credentials", () => {
  it("unsubscribe and close leave no timers", async () => {
    const h = harness();
    liveFirst();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    h.sub.unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    expect(h.sub.state).toBe("closed");
    const h2 = harness();
    last().drop(1006); // pending backoff timer
    h2.rt.close();
    expect(vi.getTimerCount()).toBe(0);
    expect(() => h2.rt.subscribe({ table: "t", onChange: () => undefined })).toThrow();
  });

  it("close() while refreshToken is pending does not reconnect", async () => {
    let resolve!: (t: string) => void;
    const h = harness({ refreshToken: () => new Promise<string>((r) => (resolve = r)) });
    liveFirst().drop(4401);
    h.rt.close();
    resolve("t");
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWS.all).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("injected WebSocket gets headers, no key in URL; global falls back to ?apikey=", () => {
    const h = harness();
    expect(last().url).toBe("wss://x.test/p/shop/realtime");
    expect(last().opts).toMatchObject({ headers: { "x-jord-key": KEY } });
    h.rt.close();
    const h2 = harness({ queryKeyFallback: true });
    expect(last().url).toContain(`?apikey=${KEY}`);
    expect(last().opts).toBeUndefined();
    h2.rt.close();
  });

  it("key and token never appear in errors", async () => {
    class Throwing {
      constructor(url: string) {
        throw new Error(`bad url ${url} token=tok-abc`);
      }
    }
    const h = harness({
      WebSocket: Throwing as unknown as WebSocketCtor,
      queryKeyFallback: true,
      token: "tok-abc",
    });
    const dump = JSON.stringify([h.states, h.errors]);
    expect(dump).not.toContain(KEY);
    expect(dump).not.toContain("tok-abc");
    h.rt.close();
    const h2 = harness();
    liveFirst().push({ type: "error", status: 403, error: "forbidden", message: `nope ${KEY}` });
    expect(JSON.stringify(h2.errors)).not.toContain(KEY);
    expect(h2.sub.state).toBe("closed");
  });

  it("cursorStore is opt-in and used for resume", async () => {
    const store = new Map<string, number | null>();
    const cursorStore = {
      get: (k: string) => (store.has(k) ? store.get(k) : 33),
      set: (k: string, v: number | null) => void store.set(k, v),
    };
    const h = harness({ cursorStore });
    await vi.advanceTimersByTimeAsync(0);
    const w = last();
    w.push({ type: "ready" });
    expect(w.sent[0]).toMatchObject({ since: 33 });
    w.push({ type: "subscribed", table: "t", cursor: 33 });
    w.push(change(34));
    expect([...store.values()]).toEqual([34]);
    h.rt.close();
  });
});

describe("security hardening (S0085 review)", () => {
  const ackThenClose = () => {
    const w = last();
    w.push({ type: "ready" });
    w.push({ type: "subscribed", table: "t", cursor: 1 });
    w.drop(1006);
  };

  it("accept->ack->close repeated escalates the backoff; stable period resets it", async () => {
    const h = harness({}, () => 0.999);
    const delays: number[] = [];
    for (let i = 0; i < 8; i++) {
      ackThenClose();
      delays.push(h.states.at(-1)!.delayMs!);
      await vi.advanceTimersByTimeAsync(30_000);
    }
    for (let i = 1; i < 6; i++) expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
    expect(delays[7]!).toBeGreaterThan(5000);
    const w = last();
    w.push({ type: "ready" });
    w.push({ type: "subscribed", table: "t", cursor: 1 });
    await vi.advanceTimersByTimeAsync(10_001);
    w.drop(1006);
    expect(h.states.at(-1)!.delayMs).toBe(499);
    h.rt.close();
  });

  it("first applied delta also resets the counters", async () => {
    const h = harness({}, () => 0.999);
    for (let i = 0; i < 3; i++) {
      ackThenClose();
      await vi.advanceTimersByTimeAsync(30_000);
    }
    const w = last();
    w.push({ type: "ready" });
    w.push({ type: "subscribed", table: "t", cursor: 1 });
    w.push(change(2));
    w.drop(1006);
    expect(h.states.at(-1)!.delayMs).toBe(499);
    h.rt.close();
  });

  it("resync loop ends terminal with resync_loop and backs off after the first", async () => {
    const h = harness({ maxConsecutiveResyncs: 5 }, () => 0.999);
    const w = last();
    w.push({ type: "ready" });
    let guard = 0;
    while (h.sub.state !== "closed" && guard++ < 20) {
      w.push({ type: "resync", table: "t" });
      await vi.advanceTimersByTimeAsync(30_000);
    }
    expect(h.sub.state).toBe("closed");
    expect(h.states.at(-1)).toMatchObject({ state: "closed", reason: "resync_loop" });
    expect(h.errors.at(-1)).toMatchObject({ code: "resync_loop", retryable: false });
    const resyncDelays = h.states.filter((s) => s.state === "resync").map((s) => s.delayMs);
    expect(resyncDelays[0]).toBeUndefined();
    expect(resyncDelays[2]!).toBeGreaterThan(resyncDelays[1]!);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("4401 refresh is bounded per stable period; browser path never refreshes", async () => {
    const refreshToken = vi.fn(async () => "n");
    const h = harness({ refreshToken, token: "old" }, () => 0.999);
    for (let i = 0; i < 4; i++) {
      last().drop(4401, "expired");
      await vi.advanceTimersByTimeAsync(30_000);
    }
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(h.sub.state).toBe("closed");
    const refresh2 = vi.fn(async () => "n");
    const h2 = harness({ refreshToken: refresh2, queryKeyFallback: true });
    last().drop(4401);
    expect(refresh2).not.toHaveBeenCalled();
    expect(h2.states.at(-1)).toMatchObject({ state: "closed", reason: "unauthorized", code: 4401 });
  });

  it("ignores cross-table, huge-seq and malformed deltas and counts them", () => {
    const h = harness();
    const w = liveFirst();
    w.push({ ...change(5), table: "other" });
    w.push(change(2 ** 41));
    w.push(change(-3));
    w.push({ ...change(6), seq: 6.5 });
    w.push({ ...change(7), row: [1] });
    w.push(change(8));
    expect(h.changes.map((c) => c.seq)).toEqual([8]);
    expect(h.sub.dropped).toBe(5);
    w.drop(1006);
    expect(h.states.at(-1)).toMatchObject({ state: "degraded", dropped: 5 });
    h.rt.close();
  });

  it("non-array snapshot rows are an error and retried; rows capped at limit; truncated -> partial", async () => {
    const h = harness();
    const w = last();
    w.push({ type: "ready" });
    w.push({ type: "snapshot", table: "t", pk: ["id"], rows: "nope", cursor: 1, truncated: false });
    expect(h.snaps).toHaveLength(0);
    expect(h.errors[0]).toMatchObject({ code: "invalid_snapshot", retryable: true });
    expect(h.sub.state).toBe("degraded");
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWS.all).toHaveLength(2);
    h.rt.close();

    const snaps: RealtimeSnapshot[] = [];
    const states: RealtimeStateEvent[] = [];
    const rt = createRealtime({ url: "https://x.test", project: "p", key: KEY, WebSocket: FakeWS as unknown as WebSocketCtor });
    const sub = rt.subscribe({
      table: "t",
      limit: 2,
      onChange: () => undefined,
      onSnapshot: (s) => snaps.push(s),
      onState: (s) => states.push(s),
    });
    const w2 = last();
    w2.push({ type: "ready" });
    w2.push({ type: "snapshot", table: "t", pk: ["id"], rows: [{ id: 1 }, { id: 2 }, { id: 3 }], cursor: 3, truncated: false });
    expect(snaps[0]!.rows).toHaveLength(2);
    expect(snaps[0]!.truncated).toBe(true);
    expect(sub.partial).toBe(true);
    expect(states.at(-1)).toMatchObject({ state: "live", partial: true });
    w2.push({ type: "resync", table: "t" });
    w2.push({ type: "snapshot", table: "t", pk: ["id"], rows: [{ id: 1 }], cursor: 9, truncated: false });
    expect(sub.partial).toBe(false);
    expect(states.at(-1)!.partial).toBeUndefined();
    rt.close();
  });

  it("redacts server-supplied code/reason and tokens replaced by refresh", async () => {
    const h = harness({ token: "tok-old-123", refreshToken: async () => "tok-new-456" });
    liveFirst().push({ type: "error", status: 400, error: `bad_${KEY}`, message: "tok-old-123 tok-new-456" });
    const dump0 = JSON.stringify([h.errors, h.states]);
    expect(dump0).not.toContain(KEY);
    expect(dump0).not.toContain("tok-old-123");

    const h2 = harness({ token: "tok-old-123", refreshToken: async () => "tok-new-456" });
    last().drop(4401, "x");
    await vi.advanceTimersByTimeAsync(2000);
    last().drop(4403, `forbidden tok-new-456 tok-old-123 ${KEY}`);
    const dump = JSON.stringify([h2.errors, h2.states]);
    for (const secret of [KEY, "tok-old-123", "tok-new-456"]) expect(dump).not.toContain(secret);
    expect(h2.errors.at(-1)!.message).toContain("[redacted]");
  });

  it("cursorStore key hashes url|project|table|filter and never contains key/token", async () => {
    const keys: string[] = [];
    const cursorStore = { get: (k: string) => (keys.push(k), null), set: () => undefined };
    const mk = (url: string, project: string, table: string, filter?: Record<string, string>) => {
      const rt = createRealtime({
        url,
        project,
        key: KEY,
        token: "tok-secret-9",
        WebSocket: FakeWS as unknown as WebSocketCtor,
        cursorStore,
      });
      rt.subscribe({ table, filter, onChange: () => undefined });
      return rt;
    };
    const rts = [
      mk("https://a.test", "p", "t"),
      mk("https://b.test", "p", "t"),
      mk("https://a.test", "q", "t"),
      mk("https://a.test", "p", "u"),
      mk("https://a.test", "p", "t", { x: "1" }),
    ];
    await vi.advanceTimersByTimeAsync(0);
    expect(new Set(keys).size).toBe(5);
    for (const k of keys) {
      expect(k).not.toContain(KEY);
      expect(k).not.toContain("tok-secret-9");
    }
    rts.forEach((r) => r.close());
  });

  it("4429 honours 5 s even with a tiny cap; jitter has a 50 ms floor", async () => {
    const h = harness({ backoffCapMs: 1000 }, () => 0);
    liveFirst().drop(4429);
    expect(h.states.at(-1)!.delayMs).toBeGreaterThanOrEqual(5000);
    await vi.advanceTimersByTimeAsync(5000);
    last().drop(1006);
    expect(h.states.at(-1)!.delayMs).toBe(50);
    h.rt.close();
  });

  it("throwing onChange reports callback_error and still advances the cursor", async () => {
    const errors: RealtimeError[] = [];
    const rt = createRealtime({
      url: "https://x.test",
      project: "p",
      key: KEY,
      WebSocket: FakeWS as unknown as WebSocketCtor,
      random: () => 0.999,
    });
    const sub = rt.subscribe({
      table: "t",
      onChange: () => {
        throw new Error("boom");
      },
      onError: (e) => errors.push(e),
    });
    const w = liveFirst();
    w.push(change(5));
    expect(errors[0]).toMatchObject({ code: "callback_error", retryable: false, message: "boom" });
    expect(sub.state).toBe("live");
    w.drop(1006);
    await vi.advanceTimersByTimeAsync(1000);
    last().push({ type: "ready" });
    expect(last().sent[0]).toMatchObject({ since: 5 });
    rt.close();
  });
});
