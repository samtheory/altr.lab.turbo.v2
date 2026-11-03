import { describe, expect, it, vi } from "vitest";

import type { Principal } from "../auth/principal.js";
import type { PolicyDecision } from "../policies/evaluate.js";
import { authorizeChannel, parseChannelRef, type ChannelRef } from "./channel-auth.js";
import { setDeadline } from "./channel-socket.js";
import {
  createMemoryPeerNetwork,
  MAX_TIMER_MS,
  parsePeerMessage,
  PresenceHub,
  type ChannelSink,
} from "./channels.js";

type Sock = ChannelSink & { msgs: Array<Record<string, unknown>>; closed: [number, string] | null };

function sock(): Sock {
  const s: Sock = {
    msgs: [],
    closed: null,
    send(text) {
      s.msgs.push(JSON.parse(text) as Record<string, unknown>);
    },
    close(code, reason) {
      s.closed = [code, reason];
    },
  };
  return s;
}

function connect(hub: PresenceHub, channel: string) {
  const s = sock();
  const res = hub.connect(channel, s);
  if (!res.ok) throw new Error(res.error);
  return { s, m: res.member };
}

const of = (s: Sock, type: string) => s.msgs.filter((m) => m.type === type);
const flush = () => new Promise((r) => setTimeout(r, 5));

describe("PresenceHub: presence + broadcast", () => {
  it("broadcast reaches other members of the channel only (not sender, not other channels)", () => {
    const hub = new PresenceHub();
    const a = connect(hub, "lab_notes:room-1");
    const b = connect(hub, "lab_notes:room-1");
    const other = connect(hub, "lab_notes:room-2");
    a.m.receive(JSON.stringify({ type: "broadcast", event: "cursor", payload: { x: 1 } }));
    expect(of(b.s, "broadcast")).toEqual([
      { type: "broadcast", channel: "lab_notes:room-1", event: "cursor", payload: { x: 1 }, from: a.m.key, kind: "anon" },
    ]);
    expect(of(a.s, "broadcast")).toEqual([]);
    expect(of(other.s, "broadcast")).toEqual([]);
    hub.close();
  });

  it("join/leave/sync carry state; disconnect removes presence", () => {
    const hub = new PresenceHub();
    const a = connect(hub, "c");
    a.m.receive(JSON.stringify({ type: "join", state: { name: "ada" } }));
    const b = connect(hub, "c");
    const sync = of(b.s, "presence").find((m) => m.event === "sync");
    expect(sync).toMatchObject({ count: 1, members: [{ key: a.m.key, state: { name: "ada" } }] });
    a.m.receive(JSON.stringify({ type: "track", state: { name: "ada", away: true } }));
    expect(of(b.s, "presence").some((m) => m.event === "update" && m.key === a.m.key)).toBe(true);
    a.m.leave();
    expect(of(b.s, "presence").at(-1)).toMatchObject({ event: "leave", key: a.m.key });
    expect(hub.members("c")).toEqual([]);
    b.m.leave();
    expect(hub.size).toBe(0);
    expect(hub.channelCount).toBe(0);
  });

  it("evicts stale presence after the heartbeat timeout", () => {
    let now = 1_000;
    const hub = new PresenceHub({ now: () => now, limits: { heartbeatTimeoutMs: 100 } });
    const a = connect(hub, "c");
    const b = connect(hub, "c");
    a.m.receive(JSON.stringify({ type: "join", state: {} }));
    now += 80;
    b.m.receive(JSON.stringify({ type: "heartbeat" }));
    now += 60; // a idle 140ms, b idle 60ms
    hub.sweep();
    expect(a.s.closed).toEqual([4408, "heartbeat_timeout"]);
    expect(b.s.closed).toBeNull();
    expect(of(b.s, "presence").at(-1)).toMatchObject({ event: "leave", key: a.m.key });
    expect(hub.members("c")).toEqual([]);
    expect(hub.size).toBe(1);
    hub.close();
  });

  it("enforces state, payload, frame and rate caps", () => {
    let now = 0;
    const hub = new PresenceHub({
      now: () => now,
      limits: { maxStateBytes: 32, maxPayloadBytes: 64, maxMessageBytes: 256, rateBurst: 3, ratePerSecond: 1, maxRateStrikes: 2 },
    });
    const a = connect(hub, "c");
    const b = connect(hub, "c");
    a.m.receive(JSON.stringify({ type: "join", state: { s: "x".repeat(40) } }));
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 413, error: "state_too_large" });
    a.m.receive(JSON.stringify({ type: "broadcast", event: "e", payload: "y".repeat(80) }));
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 413, error: "payload_too_large" });
    now += 10_000;
    a.m.receive("z".repeat(300));
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 413, error: "message_too_large" });
    expect(of(b.s, "broadcast")).toEqual([]);
    expect(hub.members("c")).toEqual([]);

    // rate: burst 3, then 429s, then close after strikes
    now += 10_000;
    for (let i = 0; i < 3; i++) a.m.receive(JSON.stringify({ type: "heartbeat" }));
    a.m.receive(JSON.stringify({ type: "heartbeat" }));
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 429 });
    a.m.receive(JSON.stringify({ type: "heartbeat" }));
    a.m.receive(JSON.stringify({ type: "heartbeat" }));
    expect(a.s.closed).toEqual([1008, "rate_limited"]);
    expect(hub.size).toBe(1);
    hub.close();
  });

  it("rejects channel addressing, bad frames and unknown types", () => {
    const hub = new PresenceHub();
    const a = connect(hub, "c1");
    const spy = connect(hub, "c2");
    a.m.receive(JSON.stringify({ type: "broadcast", channel: "c2", event: "e", payload: 1 }));
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 400, error: "channel_mismatch" });
    expect(of(spy.s, "broadcast")).toEqual([]);
    a.m.receive("not json");
    expect(of(a.s, "error").at(-1)).toMatchObject({ error: "bad_message" });
    a.m.receive(JSON.stringify({ type: "nope" }));
    expect(of(a.s, "error").at(-1)).toMatchObject({ error: "unknown_type" });
    a.m.receive(JSON.stringify({ type: "broadcast", event: "bad event!" }));
    expect(of(a.s, "error").at(-1)).toMatchObject({ error: "bad_event" });
    hub.close();
  });

  it("caps channels and members per channel", () => {
    const hub = new PresenceHub({ limits: { maxChannels: 2, maxMembersPerChannel: 2, maxLocalMembers: 3 } });
    connect(hub, "a");
    connect(hub, "a");
    expect(hub.connect("a", sock())).toEqual({ ok: false, error: "channel_full" });
    connect(hub, "b");
    expect(hub.connect("c", sock())).toEqual({ ok: false, error: "hub_full" });
    expect(hub.connect("b", sock())).toEqual({ ok: false, error: "hub_full" });
    hub.close();
    expect(hub.connect("a", sock())).toEqual({ ok: false, error: "closed" });
  });
});

describe("PresenceHub across two instances (peer transport)", () => {
  it("merges presence, forwards broadcast, propagates leave, isolates channels", async () => {
    const net = createMemoryPeerNetwork();
    const h1 = new PresenceHub({ transport: net.transport() });
    const h2 = new PresenceHub({ transport: net.transport() });
    const a = connect(h1, "room");
    a.m.receive(JSON.stringify({ type: "join", state: { n: "a" } }));
    await flush();
    const b = connect(h2, "room"); // sync_req -> h1 re-announces a
    const outsider = connect(h2, "elsewhere");
    await flush();
    expect(h2.members("room")).toEqual([{ key: a.m.key, kind: "anon", state: { n: "a" } }]);
    expect(of(b.s, "presence").some((m) => m.event === "join" && m.key === a.m.key)).toBe(true);

    b.m.receive(JSON.stringify({ type: "broadcast", event: "hi", payload: 2 }));
    await flush();
    expect(of(a.s, "broadcast")).toEqual([
      { type: "broadcast", channel: "room", event: "hi", payload: 2, from: b.m.key, kind: "anon" },
    ]);
    expect(of(b.s, "broadcast")).toEqual([]);
    expect(of(outsider.s, "broadcast")).toEqual([]);
    expect(of(outsider.s, "presence").filter((m) => m.event !== "sync")).toEqual([]);

    a.m.leave();
    await flush();
    expect(h2.members("room")).toEqual([]);
    expect(of(b.s, "presence").at(-1)).toMatchObject({ event: "leave", key: a.m.key });
    h1.close();
    h2.close();
  });

  it("drops remote members that stop announcing (TTL)", async () => {
    const net = createMemoryPeerNetwork();
    let now = 0;
    const h1 = new PresenceHub({ transport: net.transport() });
    const h2 = new PresenceHub({ transport: net.transport(), now: () => now, limits: { remoteTtlMs: 100, heartbeatTimeoutMs: 1e9 } });
    const b = connect(h2, "room");
    const a = connect(h1, "room");
    a.m.receive(JSON.stringify({ type: "join", state: {} }));
    await flush();
    expect(h2.members("room")).toHaveLength(1);
    h1.close(); // crashed instance: a closed hub publishes no leave
    now += 200;
    h2.sweep();
    expect(h2.members("room")).toEqual([]);
    expect(b.s.closed).toBeNull();
    h2.close();
  });

  it("ignores remote state for channels with no local member, and malformed peers", async () => {
    const net = createMemoryPeerNetwork();
    const t = net.transport();
    const h2 = new PresenceHub({ transport: net.transport() });
    t.publish({ v: 1, origin: "x", kind: "presence", op: "join", channel: "ghost", key: "k1", state: {} });
    await flush();
    expect(h2.channelCount).toBe(0);
    expect(parsePeerMessage({ v: 1, origin: "x", kind: "presence", op: "join", channel: "c", key: "../evil" })).toBeNull();
    expect(parsePeerMessage({ v: 2 })).toBeNull();
    expect(parsePeerMessage({ v: 1, origin: "x", kind: "broadcast", channel: "c", from: "k", event: "a b" })).toBeNull();
    h2.close();
  });
});

describe("channel authorization", () => {
  const user: Principal = { kind: "user", uid: "u1", role: "user", claims: {} };
  const ref = (raw: string) => parseChannelRef(raw) as ChannelRef;

  it("parses channel names", () => {
    expect(parseChannelRef("lab_notes")).toEqual({ channel: "lab_notes", table: "lab_notes", id: null });
    expect(parseChannelRef("lab_notes:a:b")).toEqual({ channel: "lab_notes:a:b", table: "lab_notes", id: "a:b" });
    expect(parseChannelRef("")).toHaveProperty("error");
    expect(parseChannelRef("bad-table")).toHaveProperty("error");
    expect(parseChannelRef("lab_notes:")).toHaveProperty("error");
    expect(parseChannelRef("lab_notes:a\u0000")).toHaveProperty("error");
    expect(parseChannelRef("jord_users")).toHaveProperty("error");
  });

  it("table channel requires unscoped select; row channel requires the row and its policy", async () => {
    const scoped: PolicyDecision = { allowed: true, scope: { anyOf: [[{ column: "owner_id", value: "u1" }]] } };
    const decide = vi.fn(async (_p: Principal, _t: string, _o: "select", extra?: { row?: Record<string, unknown> | null }) =>
      extra?.row ? ((extra.row.owner_id === "u1" ? { allowed: true } : { allowed: false, reason: "default_deny" }) as PolicyDecision) : scoped,
    );
    const rows: Record<string, Record<string, unknown>> = { mine: { owner_id: "u1" }, theirs: { owner_id: "u2" } };
    const readRow = async (_t: string, id: string) => (rows[id] ? { row: rows[id]! } : null);
    expect(await authorizeChannel({ principal: user, ref: ref("lab_notes"), decide, readRow })).toEqual({ allowed: false, reason: "row_scoped" });
    expect(await authorizeChannel({ principal: user, ref: ref("lab_notes:mine"), decide, readRow })).toEqual({ allowed: true });
    expect(await authorizeChannel({ principal: user, ref: ref("lab_notes:theirs"), decide, readRow })).toEqual({ allowed: false, reason: "policy" });
    expect(await authorizeChannel({ principal: user, ref: ref("lab_notes:none"), decide, readRow })).toEqual({ allowed: false, reason: "row_unavailable" });
  });

  it("fails closed when the check throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const verdict = await authorizeChannel({
      principal: user,
      ref: ref("lab_notes:x"),
      decide: async () => ({ allowed: true }),
      readRow: async () => {
        throw new Error("db down");
      },
    });
    expect(verdict).toEqual({ allowed: false, reason: "check_failed" });
    err.mockRestore();
  });
});

describe("S0083 security hardening", () => {
  const id = (principalKey: string, kind: "user" | "service" | "operator" | "anon" = "user") => ({
    principalKey,
    kind,
  });

  it("caps concurrent sockets per principal (canAdmit + connect)", () => {
    const hub = new PresenceHub({ limits: { maxSocketsPerPrincipal: 2 } });
    const s1 = hub.connect("c", sock(), id("uid:u1"));
    const s2 = hub.connect("d", sock(), id("uid:u1"));
    expect(s1.ok && s2.ok).toBe(true);
    expect(hub.canAdmit("c", "uid:u1")).toBe("principal_full");
    expect(hub.connect("e", sock(), id("uid:u1"))).toEqual({ ok: false, error: "principal_full" });
    expect(hub.connect("c", sock(), id("uid:u2")).ok).toBe(true);
    if (s1.ok) s1.member.leave();
    expect(hub.socketsFor("uid:u1")).toBe(1);
    expect(hub.connect("e", sock(), id("uid:u1")).ok).toBe(true);
    hub.close();
  });

  it("oversize and binary frames cost a token and a strike and do not refresh lastSeen", () => {
    let now = 1_000;
    const hub = new PresenceHub({
      now: () => now,
      limits: { heartbeatTimeoutMs: 100, maxMessageBytes: 32, rateBurst: 2, ratePerSecond: 0.001, maxRateStrikes: 5 },
    });
    const a = connect(hub, "c");
    now += 80;
    a.m.receive("x".repeat(64));
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 413, error: "message_too_large" });
    a.m.receiveBinary();
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 400, error: "text_only" });
    // Both tokens spent by abusive frames: next valid frame is rate limited.
    a.m.receive(JSON.stringify({ type: "heartbeat" }));
    expect(of(a.s, "error").at(-1)).toMatchObject({ code: 429 });
    hub.close();

    let t = 0;
    const hub2 = new PresenceHub({ now: () => t, limits: { heartbeatTimeoutMs: 100, maxMessageBytes: 16 } });
    const b = connect(hub2, "c");
    t += 80;
    b.m.receive("x".repeat(64));
    b.m.receiveBinary();
    t += 40; // idle 120ms of valid traffic despite junk frames at t=80
    hub2.sweep();
    expect(b.s.closed).toEqual([4408, "heartbeat_timeout"]);

    const hub3 = new PresenceHub({ limits: { maxRateStrikes: 1 } });
    const c = connect(hub3, "c");
    c.m.receiveBinary();
    expect(c.s.closed).toBeNull();
    c.m.receiveBinary();
    expect(c.s.closed).toEqual([1008, "rate_limited"]);
    expect(hub3.size).toBe(0);
  });

  it("closes a slow consumer with 1013 instead of queueing (backpressure)", () => {
    const hub = new PresenceHub({ limits: { maxBufferedBytes: 1024 } });
    const a = connect(hub, "c");
    const slow = sock();
    let buffered = 0;
    const res = hub.connect("c", { ...slow, bufferedAmount: () => buffered });
    if (!res.ok) throw new Error(res.error);
    const before = slow.msgs.length;
    buffered = 2048;
    a.m.receive(JSON.stringify({ type: "broadcast", event: "e", payload: 1 }));
    expect(slow.closed).toEqual([1013, "backpressure"]);
    expect(slow.msgs.length).toBe(before);
    expect(hub.size).toBe(1);
    hub.close();
  });

  it("stamps server-side kind on presence/broadcast; state is flagged client-asserted; no uid leaks", async () => {
    const net = createMemoryPeerNetwork();
    const h1 = new PresenceHub({ transport: net.transport() });
    const h2 = new PresenceHub({ transport: net.transport() });
    const svc = sock();
    const r1 = h1.connect("room", svc, id("uid:secret-uid", "service"));
    if (!r1.ok) throw new Error(r1.error);
    const local = sock();
    h1.connect("room", local, id("uid:other", "user"));
    const remote = sock();
    h2.connect("room", remote, id("uid:third", "user"));
    await flush();
    const joined = svc.msgs.find((m) => m.type === "joined") as Record<string, unknown>;
    expect(joined).toMatchObject({ kind: "service", limits: { clientAsserted: ["state", "payload"], serverStamped: ["kind"] } });
    r1.member.receive(JSON.stringify({ type: "join", state: { role: "admin" } }));
    r1.member.receive(JSON.stringify({ type: "broadcast", event: "e", payload: 1 }));
    await flush();
    for (const s of [local, remote]) {
      expect(of(s, "presence").find((m) => m.event === "join")).toMatchObject({ key: r1.member.key, kind: "service" });
      expect(of(s, "broadcast")).toEqual([
        { type: "broadcast", channel: "room", event: "e", payload: 1, from: r1.member.key, kind: "service" },
      ]);
      expect(JSON.stringify(s.msgs)).not.toContain("secret-uid");
    }
    h1.close();
    h2.close();
  });

  it("peer hygiene: own origin ignored, remote keys owned by origin, sync_req rate limited", () => {
    let now = 10_000;
    const published: Array<Record<string, unknown>> = [];
    let deliver: (msg: never) => void = () => undefined;
    const hub = new PresenceHub({
      instanceId: "me",
      now: () => now,
      transport: {
        publish: (m) => published.push(m as Record<string, unknown>),
        subscribe: (l) => {
          deliver = l as (msg: never) => void;
          return () => undefined;
        },
      },
    });
    const peer = (m: Record<string, unknown>) => deliver({ v: 1, channel: "room", ...m } as never);
    const a = connect(hub, "room");
    a.m.receive(JSON.stringify({ type: "join", state: {} }));

    peer({ origin: "me", kind: "presence", op: "join", key: "forged", state: {}, pk: "operator" });
    expect(hub.members("room").map((m) => m.key)).toEqual([a.m.key]);

    peer({ origin: "o1", kind: "presence", op: "join", key: "k1", state: { n: 1 }, pk: "user" });
    peer({ origin: "o2", kind: "presence", op: "update", key: "k1", state: { n: 2 }, pk: "operator" });
    peer({ origin: "o2", kind: "presence", op: "leave", key: "k1" });
    expect(hub.members("room").find((m) => m.key === "k1")).toEqual({ key: "k1", kind: "user", state: { n: 1 } });
    peer({ origin: "o1", kind: "presence", op: "leave", key: "k1" });
    expect(hub.members("room").some((m) => m.key === "k1")).toBe(false);
    // Unstamped join is dropped.
    peer({ origin: "o1", kind: "presence", op: "join", key: "k2", state: {} });
    expect(hub.members("room").some((m) => m.key === "k2")).toBe(false);

    const announces = () => published.filter((m) => m.kind === "presence" && m.op === "update").length;
    const base = announces();
    peer({ origin: "o1", kind: "sync_req" });
    peer({ origin: "o2", kind: "sync_req" });
    peer({ origin: "o3", kind: "sync_req" });
    expect(announces()).toBe(base + 1);
    now += 2_001;
    peer({ origin: "o1", kind: "sync_req" });
    expect(announces()).toBe(base + 2);
    hub.close();
  });

  it("row channel: policy runs before the row read; missing and denied rows do the same work", async () => {
    const user: Principal = { kind: "user", uid: "u1", role: "user", claims: {} };
    const readRow = vi.fn(async (_t: string, id: string) => (id === "theirs" ? { row: { owner_id: "u2" } } : null));
    const denyAll = vi.fn(async () => ({ allowed: false, reason: "default_deny" }) as PolicyDecision);
    expect(await authorizeChannel({ principal: user, ref: parseChannelRef("t:theirs") as ChannelRef, decide: denyAll, readRow })).toEqual({ allowed: false, reason: "policy" });
    expect(readRow).not.toHaveBeenCalled();

    const rowDecide = vi.fn(async (_p: Principal, _t: string, _o: "select", extra?: { row?: Record<string, unknown> | null }) =>
      (extra?.row ? (extra.row.owner_id === "u1" ? { allowed: true } : { allowed: false, reason: "default_deny" }) : { allowed: true, scope: {} }) as PolicyDecision,
    );
    await authorizeChannel({ principal: user, ref: parseChannelRef("t:theirs") as ChannelRef, decide: rowDecide, readRow });
    const deniedCalls = rowDecide.mock.calls.length;
    rowDecide.mockClear();
    const missing = await authorizeChannel({ principal: user, ref: parseChannelRef("t:none") as ChannelRef, decide: rowDecide, readRow });
    expect(missing).toEqual({ allowed: false, reason: "row_unavailable" });
    expect(rowDecide.mock.calls.length).toBe(deniedCalls);
  });

  it("setDeadline clamps delays above 2^31-1 ms and re-arms", () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn();
      const at = Date.now() + MAX_TIMER_MS + 5_000;
      const d = setDeadline(at, fn);
      vi.advanceTimersByTime(10);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(MAX_TIMER_MS);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(5_000);
      expect(fn).toHaveBeenCalledTimes(1);
      d.clear();
    } finally {
      vi.useRealTimers();
    }
  });
});
