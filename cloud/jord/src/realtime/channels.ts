/**
 * S0083 — ephemeral presence + broadcast channels.
 *
 * One `PresenceHub` per process. Nothing is persisted. Every socket is bound
 * to exactly one channel at upgrade time (after the policy check in
 * `channel-auth.ts`), so a client can never address another channel: there is
 * no channel field it can set that the hub honours.
 *
 * Multi-instance: hubs exchange `PeerMessage`s through a `PeerTransport`
 * (Postgres NOTIFY in `presence-pg.ts`). Each instance owns its local members;
 * remote members are cached with a TTL, refreshed by periodic announces, and
 * merged into `sync` on read. Remote state is kept only for channels that
 * have at least one local member, so memory stays bounded by local caps.
 *
 * Trust: presence `state` and broadcast `payload` are CLIENT-ASSERTED and
 * untrusted. The hub only bounds their size and JSON shape; it never checks
 * their meaning. The only server-stamped field is `kind` (the sender's
 * principal kind: user / service / operator / anon) on presence and
 * broadcast messages, so a client can tell a service/operator sender from an
 * ordinary user. User ids are never exposed: member keys are random per
 * socket. The `joined` frame repeats this in `limits.clientAsserted`.
 *
 * Abuse caps: per-principal concurrent sockets (`maxSocketsPerPrincipal`),
 * per-socket token bucket (oversize / binary frames also cost a token and a
 * strike), outbound backpressure (`maxBufferedBytes`, close 1013), and
 * peer-message hygiene (own-origin ignored, remote keys owned by the origin
 * that announced them, `sync_req` answered at most once per window).
 */

import { randomUUID } from "node:crypto";

import type { PrincipalKind } from "../auth/principal.js";
import { isPrincipalKind } from "../auth/principal.js";

export type PresenceLimits = {
  /** Distinct channels with at least one local member. */
  maxChannels: number;
  /** Local members per channel. */
  maxMembersPerChannel: number;
  /** Local members across all channels. */
  maxLocalMembers: number;
  /** Cached remote members per channel (others are ignored). */
  maxRemoteMembersPerChannel: number;
  /** Serialized presence state cap (bytes). */
  maxStateBytes: number;
  /** Serialized broadcast payload cap (bytes). */
  maxPayloadBytes: number;
  /** Raw inbound frame cap (bytes); checked before JSON.parse. */
  maxMessageBytes: number;
  /** Token bucket: sustained messages per second per connection. */
  ratePerSecond: number;
  /** Token bucket: burst size per connection. */
  rateBurst: number;
  /** Rate-limited frames tolerated before the socket is closed (1008). */
  maxRateStrikes: number;
  /** Local member with no inbound frame for this long is evicted (4408). */
  heartbeatTimeoutMs: number;
  /** Remote member not re-announced for this long is dropped. */
  remoteTtlMs: number;
  /** Sweep cadence for eviction. */
  sweepMs: number;
  /** Re-announce cadence for local tracked members to peers. */
  announceMs: number;
  /** Concurrent channel sockets per principal key (uid, else kind+role+IP). */
  maxSocketsPerPrincipal: number;
  /** Outbound ws buffer above which a member is closed (1013), not queued. */
  maxBufferedBytes: number;
  /** Minimum gap between answers to peer `sync_req` per channel. */
  syncReqMinGapMs: number;
};

export const DEFAULT_PRESENCE_LIMITS: PresenceLimits = {
  maxChannels: 256,
  maxMembersPerChannel: 64,
  maxLocalMembers: 256,
  maxRemoteMembersPerChannel: 256,
  maxStateBytes: 1024,
  maxPayloadBytes: 4096,
  maxMessageBytes: 6144,
  ratePerSecond: 10,
  rateBurst: 20,
  maxRateStrikes: 50,
  heartbeatTimeoutMs: 60_000,
  remoteTtlMs: 45_000,
  sweepMs: 5_000,
  announceMs: 15_000,
  maxSocketsPerPrincipal: 8,
  maxBufferedBytes: 1024 * 1024,
  syncReqMinGapMs: 2_000,
};

/**
 * ws-level frame cap (bytes) applied to the shared WebSocketServer. Frames
 * above it are rejected by `ws` with close 1009 before being buffered.
 */
export const WS_MAX_PAYLOAD_BYTES = 64 * 1024;

/** `setTimeout` overflows above 2^31-1 ms (fires immediately). */
export const MAX_TIMER_MS = 2 ** 31 - 1;

/** Close codes used on presence sockets. */
export const PRESENCE_CLOSE = {
  tokenExpired: 4401,
  accessRevoked: 4403,
  heartbeatTimeout: 4408,
  rateLimited: 1008,
  full: 1013,
  backpressure: 1013,
  shutdown: 1001,
} as const;

export type ChannelSink = {
  send(text: string): void;
  close(code: number, reason: string): void;
  /** Bytes queued on the socket but not yet written (ws `bufferedAmount`). */
  bufferedAmount?(): number;
};

/** Server-known facts about the socket's principal (never sent: `principalKey`). */
export type ConnectIdentity = {
  /** Cap key: uid, else kind+role+client IP. Never exposed to clients. */
  principalKey: string;
  kind: PrincipalKind;
};

export type PeerMessage =
  | {
      v: 1;
      origin: string;
      kind: "presence";
      op: "join" | "update" | "leave";
      channel: string;
      key: string;
      state?: unknown;
      /** Sender principal kind (server-stamped by the origin instance). */
      pk?: PrincipalKind;
    }
  | {
      v: 1;
      origin: string;
      kind: "broadcast";
      channel: string;
      from: string;
      event: string;
      payload: unknown;
      pk?: PrincipalKind;
    }
  | { v: 1; origin: string; kind: "sync_req"; channel: string };

export type PeerTransport = {
  publish(msg: PeerMessage): void;
  subscribe(listener: (msg: PeerMessage) => void): () => void;
};

export type ChannelMember = {
  readonly key: string;
  readonly channel: string;
  /** Handle one inbound client frame (text). */
  receive(raw: string): void;
  /** A binary frame arrived (rejected; costs a token and a strike). */
  receiveBinary(): void;
  /** Remove membership (idempotent). Emits leave when tracked. */
  leave(): void;
};

export type AdmitError = "hub_full" | "channel_full" | "principal_full" | "closed";

type LocalMember = {
  key: string;
  channel: string;
  sink: ChannelSink;
  principalKey: string;
  kind: PrincipalKind;
  tracked: boolean;
  state: unknown;
  stateJson: string;
  lastSeen: number;
  tokens: number;
  refillAt: number;
  strikes: number;
  gone: boolean;
};

type RemoteMember = {
  key: string;
  /** Owning instance: only it may update or remove this key. */
  origin: string;
  kind: PrincipalKind;
  state: unknown;
  stateJson: string;
  expiresAt: number;
};

type Channel = {
  name: string;
  locals: Map<string, LocalMember>;
  remotes: Map<string, RemoteMember>;
  /** Last time this hub answered a peer `sync_req` for the channel. */
  lastSyncReplyAt: number;
};

/** Fallback for direct hub callers (tests): uncapped key, `anon` label. */
function directIdentity(): ConnectIdentity {
  return { principalKey: `direct:${randomUUID()}`, kind: "anon" };
}

const EVENT_NAME = /^[A-Za-z0-9_.:-]{1,64}$/;
const KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;

function byteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

/** JSON-serialize a client value; null when not serializable. */
function safeJson(value: unknown): string | null {
  try {
    const out = JSON.stringify(value);
    return typeof out === "string" ? out : null;
  } catch {
    return null;
  }
}

/** Defensive parse of a peer message; anything malformed is dropped. */
export function parsePeerMessage(raw: unknown): PeerMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (m.v !== 1 || typeof m.origin !== "string" || typeof m.channel !== "string") {
    return null;
  }
  if (m.channel.length === 0 || m.channel.length > 300) return null;
  if (m.origin.length === 0 || m.origin.length > 64) return null;
  if (m.kind === "sync_req") {
    return { v: 1, origin: m.origin, kind: "sync_req", channel: m.channel };
  }
  const pk = typeof m.pk === "string" && isPrincipalKind(m.pk) ? m.pk : null;
  if (m.kind === "presence") {
    if (m.op !== "join" && m.op !== "update" && m.op !== "leave") return null;
    if (typeof m.key !== "string" || !KEY_RE.test(m.key)) return null;
    // join/update must carry the origin-stamped principal kind.
    if (m.op !== "leave" && !pk) return null;
    return {
      v: 1,
      origin: m.origin,
      kind: "presence",
      op: m.op,
      channel: m.channel,
      key: m.key,
      state: m.state,
      ...(pk ? { pk } : {}),
    };
  }
  if (m.kind === "broadcast") {
    if (typeof m.from !== "string" || !KEY_RE.test(m.from)) return null;
    if (typeof m.event !== "string" || !EVENT_NAME.test(m.event)) return null;
    if (!pk) return null;
    return {
      v: 1,
      origin: m.origin,
      kind: "broadcast",
      channel: m.channel,
      from: m.from,
      event: m.event,
      payload: m.payload,
      pk,
    };
  }
  return null;
}

export type PresenceHubOptions = {
  limits?: Partial<PresenceLimits>;
  transport?: PeerTransport | null;
  now?: () => number;
  instanceId?: string;
};

export class PresenceHub {
  readonly instanceId: string;
  readonly limits: PresenceLimits;
  private readonly channels = new Map<string, Channel>();
  /** Live local sockets per principal key (cap: `maxSocketsPerPrincipal`). */
  private readonly perPrincipal = new Map<string, number>();
  private readonly transport: PeerTransport | null;
  private readonly now: () => number;
  private unsubscribePeer: (() => void) | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;
  private localCount = 0;
  private closed = false;

  constructor(opts: PresenceHubOptions = {}) {
    this.instanceId = opts.instanceId ?? randomUUID();
    this.limits = { ...DEFAULT_PRESENCE_LIMITS, ...(opts.limits ?? {}) };
    this.transport = opts.transport ?? null;
    this.now = opts.now ?? Date.now;
    if (this.transport) {
      this.unsubscribePeer = this.transport.subscribe((msg) => this.onPeer(msg));
    }
  }

  /** Local members across all channels. */
  get size(): number {
    return this.localCount;
  }

  get channelCount(): number {
    return this.channels.size;
  }

  /** Live local sockets held by one principal key. */
  socketsFor(principalKey: string): number {
    return this.perPrincipal.get(principalKey) ?? 0;
  }

  /**
   * Pre-upgrade admission check (no side effects). The per-principal cap is
   * checked first so one caller filling its quota gets 429, not 503.
   */
  canAdmit(channel: string, principalKey?: string): AdmitError | null {
    if (this.closed) return "closed";
    if (
      principalKey != null &&
      this.socketsFor(principalKey) >= this.limits.maxSocketsPerPrincipal
    ) {
      return "principal_full";
    }
    if (this.localCount >= this.limits.maxLocalMembers) return "hub_full";
    const ch = this.channels.get(channel);
    if (!ch) {
      return this.channels.size >= this.limits.maxChannels ? "hub_full" : null;
    }
    return ch.locals.size >= this.limits.maxMembersPerChannel ? "channel_full" : null;
  }

  /**
   * Members visible on a channel (tracked locals + live remotes). `state` is
   * client-asserted; `kind` is server-stamped.
   */
  members(channel: string): Array<{ key: string; kind: PrincipalKind; state: unknown }> {
    const ch = this.channels.get(channel);
    if (!ch) return [];
    const now = this.now();
    const out: Array<{ key: string; kind: PrincipalKind; state: unknown }> = [];
    for (const m of ch.locals.values()) {
      if (m.tracked) out.push({ key: m.key, kind: m.kind, state: m.state });
    }
    for (const r of ch.remotes.values()) {
      if (r.expiresAt > now) out.push({ key: r.key, kind: r.kind, state: r.state });
    }
    return out;
  }

  /**
   * Bind a socket to a channel. Caller must have authorized the principal
   * for this channel first. `identity` drives the per-principal cap and the
   * server-stamped `kind`; it is never sent to clients beyond `kind`.
   */
  connect(
    channel: string,
    sink: ChannelSink,
    identity: ConnectIdentity = directIdentity(),
  ): { ok: true; member: ChannelMember } | { ok: false; error: AdmitError } {
    const admit = this.canAdmit(channel, identity.principalKey);
    if (admit) return { ok: false, error: admit };
    let ch = this.channels.get(channel);
    const fresh = !ch;
    if (!ch) {
      ch = { name: channel, locals: new Map(), remotes: new Map(), lastSyncReplyAt: -Infinity };
      this.channels.set(channel, ch);
    }
    const now = this.now();
    const local: LocalMember = {
      key: randomUUID(),
      channel,
      sink,
      principalKey: identity.principalKey,
      kind: identity.kind,
      tracked: false,
      state: null,
      stateJson: "null",
      lastSeen: now,
      tokens: this.limits.rateBurst,
      refillAt: now,
      strikes: 0,
      gone: false,
    };
    ch.locals.set(local.key, local);
    this.localCount += 1;
    this.perPrincipal.set(local.principalKey, this.socketsFor(local.principalKey) + 1);
    this.ensureTimers();
    if (fresh) this.publishPeer({ v: 1, origin: this.instanceId, kind: "sync_req", channel });

    this.sendOne(local, {
      type: "joined",
      channel,
      key: local.key,
      kind: local.kind,
      limits: {
        maxStateBytes: this.limits.maxStateBytes,
        maxPayloadBytes: this.limits.maxPayloadBytes,
        heartbeatTimeoutMs: this.limits.heartbeatTimeoutMs,
        // Presence state and broadcast payloads are untrusted client input;
        // only `kind` on presence/broadcast messages is server-stamped.
        clientAsserted: ["state", "payload"],
        serverStamped: ["kind"],
      },
    });
    this.sendSync(local);

    const member: ChannelMember = {
      key: local.key,
      channel,
      receive: (raw) => this.receive(local, raw),
      receiveBinary: () =>
        this.penalize(local, 400, "text_only", "binary frames are not accepted"),
      leave: () => this.disconnect(local),
    };
    return { ok: true, member };
  }

  /** Evict stale local members and expired remotes. Exposed for tests. */
  sweep(): void {
    const now = this.now();
    for (const ch of [...this.channels.values()]) {
      for (const local of [...ch.locals.values()]) {
        if (now - local.lastSeen > this.limits.heartbeatTimeoutMs) {
          this.kick(local, PRESENCE_CLOSE.heartbeatTimeout, "heartbeat_timeout");
        }
      }
      for (const remote of [...ch.remotes.values()]) {
        if (remote.expiresAt <= now) {
          ch.remotes.delete(remote.key);
          this.fanout(ch, { type: "presence", event: "leave", channel: ch.name, key: remote.key });
        }
      }
    }
  }

  /** Re-announce tracked locals to peers (keeps remote TTLs fresh). */
  announce(): void {
    for (const ch of this.channels.values()) this.announceChannel(ch);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.unsubscribePeer?.();
    this.unsubscribePeer = null;
    for (const ch of [...this.channels.values()]) {
      for (const local of [...ch.locals.values()]) {
        this.kick(local, PRESENCE_CLOSE.shutdown, "shutdown");
      }
    }
    this.channels.clear();
    this.stopTimers();
  }

  // ---- internals ----

  private ensureTimers(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweep(), this.limits.sweepMs);
    this.sweepTimer.unref?.();
    if (this.transport) {
      this.announceTimer = setInterval(() => this.announce(), this.limits.announceMs);
      this.announceTimer.unref?.();
    }
  }

  private stopTimers(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    if (this.announceTimer) clearInterval(this.announceTimer);
    this.sweepTimer = null;
    this.announceTimer = null;
  }

  private disconnect(local: LocalMember): void {
    if (local.gone) return;
    local.gone = true;
    const left = this.socketsFor(local.principalKey) - 1;
    if (left > 0) this.perPrincipal.set(local.principalKey, left);
    else this.perPrincipal.delete(local.principalKey);
    const ch = this.channels.get(local.channel);
    if (!ch || ch.locals.get(local.key) !== local) return;
    ch.locals.delete(local.key);
    this.localCount -= 1;
    if (local.tracked) {
      local.tracked = false;
      this.fanout(ch, { type: "presence", event: "leave", channel: ch.name, key: local.key });
      this.publishPeer({
        v: 1,
        origin: this.instanceId,
        kind: "presence",
        op: "leave",
        channel: ch.name,
        key: local.key,
      });
    }
    if (ch.locals.size === 0) this.channels.delete(ch.name);
    if (this.localCount === 0) this.stopTimers();
  }

  /** Remove membership, then close the socket. */
  private kick(local: LocalMember, code: number, reason: string): void {
    this.disconnect(local);
    try {
      local.sink.close(code, reason);
    } catch {
      /* already closed */
    }
  }

  private takeToken(local: LocalMember): boolean {
    const now = this.now();
    const elapsed = Math.max(0, now - local.refillAt);
    local.refillAt = now;
    local.tokens = Math.min(
      this.limits.rateBurst,
      local.tokens + (elapsed * this.limits.ratePerSecond) / 1000,
    );
    if (local.tokens < 1) return false;
    local.tokens -= 1;
    return true;
  }

  /** Count a strike; closes (1008) past the cap. Returns false when closed. */
  private strike(local: LocalMember): boolean {
    local.strikes += 1;
    if (local.strikes > this.limits.maxRateStrikes) {
      this.kick(local, PRESENCE_CLOSE.rateLimited, "rate_limited");
      return false;
    }
    return true;
  }

  /**
   * Abusive frame (oversize / binary): costs a token AND a strike before any
   * reply, and does not refresh `lastSeen` (cannot be used as a keepalive).
   */
  private penalize(local: LocalMember, code: number, error: string, message: string): void {
    if (local.gone) return;
    this.takeToken(local);
    if (!this.strike(local)) return;
    this.error(local, code, error, message);
  }

  private error(local: LocalMember, code: number, error: string, message: string): void {
    this.sendOne(local, { type: "error", code, error, message });
  }

  private receive(local: LocalMember, raw: string): void {
    if (local.gone) return;
    // Cheap UTF-16 bound first so a huge frame is not re-encoded.
    if (raw.length > this.limits.maxMessageBytes || byteLength(raw) > this.limits.maxMessageBytes) {
      this.penalize(local, 413, "message_too_large", "frame exceeds the size cap");
      return;
    }
    local.lastSeen = this.now();
    if (!this.takeToken(local)) {
      if (!this.strike(local)) return;
      this.error(local, 429, "rate_limited", "too many messages");
      return;
    }
    let msg: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
      msg = parsed as Record<string, unknown>;
    } catch {
      this.error(local, 400, "bad_message", "frame must be a JSON object");
      return;
    }
    if (msg.channel !== undefined && msg.channel !== local.channel) {
      this.error(local, 400, "channel_mismatch", "socket is bound to one channel");
      return;
    }
    const ch = this.channels.get(local.channel);
    if (!ch) return;
    switch (msg.type) {
      case "heartbeat":
      case "pong":
      case "ping":
        return;
      case "join":
      case "track": {
        const config =
          msg.config && typeof msg.config === "object"
            ? (msg.config as Record<string, unknown>)
            : null;
        const state = msg.state !== undefined ? msg.state : (config?.state ?? {});
        const json = safeJson(state);
        if (json == null) {
          this.error(local, 400, "bad_state", "state must be JSON");
          return;
        }
        if (byteLength(json) > this.limits.maxStateBytes) {
          this.error(local, 413, "state_too_large", "presence state exceeds the size cap");
          return;
        }
        const first = !local.tracked;
        if (!first && json === local.stateJson) return;
        local.tracked = true;
        local.state = JSON.parse(json) as unknown;
        local.stateJson = json;
        this.fanout(ch, {
          type: "presence",
          event: first ? "join" : "update",
          channel: ch.name,
          key: local.key,
          kind: local.kind,
          state: local.state,
        });
        this.publishPeer({
          v: 1,
          origin: this.instanceId,
          kind: "presence",
          op: first ? "join" : "update",
          channel: ch.name,
          key: local.key,
          state: local.state,
          pk: local.kind,
        });
        return;
      }
      case "leave":
      case "untrack": {
        if (!local.tracked) return;
        local.tracked = false;
        local.state = null;
        local.stateJson = "null";
        this.fanout(ch, { type: "presence", event: "leave", channel: ch.name, key: local.key });
        this.publishPeer({
          v: 1,
          origin: this.instanceId,
          kind: "presence",
          op: "leave",
          channel: ch.name,
          key: local.key,
        });
        return;
      }
      case "sync":
        this.sendSync(local);
        return;
      case "broadcast": {
        if (typeof msg.event !== "string" || !EVENT_NAME.test(msg.event)) {
          this.error(local, 400, "bad_event", "event must match [A-Za-z0-9_.:-]{1,64}");
          return;
        }
        const json = safeJson(msg.payload ?? null);
        if (json == null) {
          this.error(local, 400, "bad_payload", "payload must be JSON");
          return;
        }
        if (byteLength(json) > this.limits.maxPayloadBytes) {
          this.error(local, 413, "payload_too_large", "broadcast payload exceeds the size cap");
          return;
        }
        const payload = JSON.parse(json) as unknown;
        this.fanout(
          ch,
          {
            type: "broadcast",
            channel: ch.name,
            event: msg.event,
            payload,
            from: local.key,
            kind: local.kind,
          },
          local.key,
        );
        this.publishPeer({
          v: 1,
          origin: this.instanceId,
          kind: "broadcast",
          channel: ch.name,
          from: local.key,
          event: msg.event,
          payload,
          pk: local.kind,
        });
        return;
      }
      default:
        this.error(local, 400, "unknown_type", "unknown message type");
    }
  }

  private onPeer(input: PeerMessage): void {
    if (this.closed) return;
    const msg = parsePeerMessage(input);
    // Own echoes (and NOTIFYs forged with our id) are ignored.
    if (!msg || msg.origin === this.instanceId) return;
    const ch = this.channels.get(msg.channel);
    // Only cache/forward for channels with local members: bounded memory.
    if (!ch) return;
    if (msg.kind === "sync_req") {
      const now = this.now();
      if (now - ch.lastSyncReplyAt < this.limits.syncReqMinGapMs) return;
      ch.lastSyncReplyAt = now;
      this.announceChannel(ch);
      return;
    }
    if (msg.kind === "broadcast") {
      // A peer cannot speak as one of our local members.
      if (ch.locals.has(msg.from) || !msg.pk) return;
      const json = safeJson(msg.payload ?? null);
      if (json == null || byteLength(json) > this.limits.maxPayloadBytes) return;
      this.fanout(ch, {
        type: "broadcast",
        channel: ch.name,
        event: msg.event,
        payload: msg.payload ?? null,
        from: msg.from,
        kind: msg.pk,
      });
      return;
    }
    if (ch.locals.has(msg.key)) return;
    const existing = ch.remotes.get(msg.key);
    // Only the instance that announced a key may update or remove it.
    if (existing && existing.origin !== msg.origin) return;
    if (msg.op === "leave") {
      if (existing) {
        ch.remotes.delete(msg.key);
        this.fanout(ch, { type: "presence", event: "leave", channel: ch.name, key: msg.key });
      }
      return;
    }
    if (!msg.pk) return;
    const json = safeJson(msg.state ?? null);
    if (json == null || byteLength(json) > this.limits.maxStateBytes) return;
    const expiresAt = this.now() + this.limits.remoteTtlMs;
    if (existing) {
      existing.expiresAt = expiresAt;
      if (existing.stateJson === json && existing.kind === msg.pk) return;
      existing.state = msg.state ?? null;
      existing.stateJson = json;
      existing.kind = msg.pk;
      this.fanout(ch, {
        type: "presence",
        event: "update",
        channel: ch.name,
        key: msg.key,
        kind: existing.kind,
        state: existing.state,
      });
      return;
    }
    if (ch.remotes.size >= this.limits.maxRemoteMembersPerChannel) return;
    ch.remotes.set(msg.key, {
      key: msg.key,
      origin: msg.origin,
      kind: msg.pk,
      state: msg.state ?? null,
      stateJson: json,
      expiresAt,
    });
    this.fanout(ch, {
      type: "presence",
      event: "join",
      channel: ch.name,
      key: msg.key,
      kind: msg.pk,
      state: msg.state ?? null,
    });
  }

  private announceChannel(ch: Channel): void {
    for (const local of ch.locals.values()) {
      if (!local.tracked) continue;
      this.publishPeer({
        v: 1,
        origin: this.instanceId,
        kind: "presence",
        op: "update",
        channel: ch.name,
        key: local.key,
        state: local.state,
        pk: local.kind,
      });
    }
  }

  private sendSync(local: LocalMember): void {
    const members = this.members(local.channel);
    this.sendOne(local, {
      type: "presence",
      event: "sync",
      channel: local.channel,
      count: members.length,
      members,
    });
  }

  /** True when the socket's outbound buffer is over the backpressure cap. */
  private congested(local: LocalMember): boolean {
    try {
      return (local.sink.bufferedAmount?.() ?? 0) > this.limits.maxBufferedBytes;
    } catch {
      return false;
    }
  }

  private sendOne(local: LocalMember, body: unknown): void {
    if (local.gone) return;
    if (this.congested(local)) {
      this.kick(local, PRESENCE_CLOSE.backpressure, "backpressure");
      return;
    }
    try {
      local.sink.send(JSON.stringify(body));
    } catch {
      /* socket closing; onClose removes it */
    }
  }

  /**
   * Send to every local member of `ch` (except `skipKey`). A slow consumer
   * is closed (1013), never queued; kicks run after the loop.
   */
  private fanout(ch: Channel, body: unknown, skipKey?: string): void {
    const text = JSON.stringify(body);
    const slow: LocalMember[] = [];
    for (const local of ch.locals.values()) {
      if (local.key === skipKey || local.gone) continue;
      if (this.congested(local)) {
        slow.push(local);
        continue;
      }
      try {
        local.sink.send(text);
      } catch {
        /* socket closing */
      }
    }
    for (const local of slow) this.kick(local, PRESENCE_CLOSE.backpressure, "backpressure");
  }

  private publishPeer(msg: PeerMessage): void {
    if (!this.transport || this.closed) return;
    try {
      this.transport.publish(msg);
    } catch (err) {
      console.error("[@altr/jord-server] presence peer publish failed", err);
    }
  }
}

/**
 * In-memory transport linking hubs in one process (tests / single node).
 * Delivery is async (microtask) to mimic a real bus.
 */
export function createMemoryPeerNetwork(): { transport(): PeerTransport } {
  const listeners = new Set<(msg: PeerMessage) => void>();
  return {
    transport(): PeerTransport {
      return {
        publish(msg) {
          const copy = JSON.parse(JSON.stringify(msg)) as PeerMessage;
          queueMicrotask(() => {
            for (const l of listeners) l(copy);
          });
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    },
  };
}
