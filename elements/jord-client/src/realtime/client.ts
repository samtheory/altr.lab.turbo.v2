/**
 * Jord realtime client (S0085) — dependency-free reconnect / resume / resync
 * over the S0084 app endpoint `/p/:project/realtime`.
 *
 * ## Wire (consumed, see S0084)
 * server -> client: `ready`, `snapshot {rows,pk,cursor,truncated}`,
 * `subscribed {cursor}`, `jord.change {table,op,seq,row,...}`, `resync`,
 * `error {status,error}`, `ping`. client -> server: `subscribe`, `pong`.
 * One subscription per socket (server limit), so each `subscribe()` owns one.
 *
 * ## State contract (`onState`, one event per transition)
 * - `connecting`  socket opening / waiting for `ready` / `subscribed|snapshot`.
 * - `live`        base established (snapshot or resume ack); deltas flow.
 * - `degraded`    socket lost (close, heartbeat timeout, retryable error);
 *                 waiting out a backoff (`delayMs`) -> back to `connecting`.
 * - `resync`      the server said the cursor is unusable (`resync` frame or
 *                 409 `resync_required`). The local cursor is discarded and
 *                 the subscription re-subscribes WITHOUT `since`; deltas are
 *                 suppressed until the fresh `snapshot` arrives -> `live`.
 * - `closed`      terminal (unsubscribe/close, 4401 after refresh, 4403, 4410,
 *                 fatal 4xx error frame). Never reconnects. `reason` set.
 * Event shape: `{state, reason?, code?, attempt?, delayMs?, at}`.
 *
 * ## Data contract
 * - `onSnapshot({rows,pk,cursor,truncated,reason:"initial"|"resync"|"reconnect"})`
 *   replace local state. Fires on every fresh snapshot (a reconnect with a
 *   still-valid cursor does NOT snapshot; it just resumes via `since`).
 * - `onChange(delta)`: strictly increasing `seq`, each seq at most once, never
 *   before the base snapshot/resume ack of the current connection. Gaps in
 *   `seq` are NORMAL (the outbox seq is global across tables); only an
 *   explicit `resync`/409 means loss. Duplicates (`seq <= cursor`) are dropped.
 * - `onError({code,message,status?,retryable})`: message never contains the
 *   key or token (redacted).
 *
 * ## Reconnect policy
 * Full-jitter backoff: delay = max(50 ms, floor(random() * min(cap, base * 2^attempt))),
 * base 500 ms, cap 30 s. `attempt`, the refresh allowance and the consecutive
 * resync count reset ONLY once the connection stayed live for `stableLiveMs`
 * (default 10 s) or after the first applied delta; a server that accepts,
 * acks, then closes therefore keeps escalating.
 * Heartbeat: any inbound message re-arms `heartbeatTimeoutMs` (45 s); the
 * server pings every 15 s. Close 4401 -> (only when headers carry the token
 * and `refreshToken` exists) one refresh per stable period, then reconnect
 * through the normal backoff; otherwise terminal `unauthorized`.
 * 4403/4410 terminal; 4429 -> backoff >= 5 s (even if `backoffCapMs` is
 * lower); 1009/1013/others -> backoff.
 * Resync: the first resync of a stable period resubscribes at once; later ones
 * wait the normal backoff; after `maxConsecutiveResyncs` (5) the subscription
 * closes with reason `resync_loop`.
 *
 * ## Validation
 * `jord.change` frames for another table, with a non-safe-integer / non-positive
 * seq, a seq jump > cursor + 2^40, or a malformed row/pk are ignored and
 * counted (`dropped`, exposed on state events and `subscription.dropped`).
 * Snapshot `rows` must be an array (else retryable `invalid_snapshot`) and are
 * capped at the subscribe `limit`.
 *
 * ## Partial snapshots
 * When a snapshot is `truncated` (or capped), snapshot + deltas is INCOMPLETE:
 * `onSnapshot` gets `truncated:true`, `subscription.partial` and state events
 * carry `partial:true` until a non-truncated snapshot arrives.
 *
 * ## Callbacks
 * A throwing `onChange` is reported via `onError` (`callback_error`,
 * non-retryable) and the cursor STILL advances (that delta is not redelivered).
 *
 * ## Credentials (trade-off)
 * With an injected WebSocket (Node `ws`) the key is sent as `x-jord-key` and
 * the token as `Authorization: Bearer` headers. The global browser WebSocket
 * cannot set headers, so the key falls back to `?apikey=` on the upgrade URL
 * ONLY (S0084 accepts it only there). Query strings can land in proxy / access
 * logs: use a publishable key (never a secret) and rotate if logs leak. The
 * server reads end-user JWTs only from the Authorization header, so a browser
 * connection is anonymous-role until the endpoint grows a token channel.
 *
 * Cursor persistence is memory-only unless the caller passes `cursorStore`.
 */

export type RealtimeStateName = "connecting" | "live" | "degraded" | "resync" | "closed";

export type RealtimeStateEvent = {
  state: RealtimeStateName;
  reason?: string;
  code?: number;
  attempt?: number;
  delayMs?: number;
  /** Present (true) while the base snapshot was truncated. */
  partial?: boolean;
  /** Count of ignored malformed / foreign-table change frames (when > 0). */
  dropped?: number;
  at: number;
};

export type RealtimeChange = {
  type?: "jord.change";
  table: string;
  op: string;
  seq: number;
  row: Record<string, unknown> | null;
  [k: string]: unknown;
};

export type RealtimeSnapshot = {
  table: string;
  rows: Array<Record<string, unknown>>;
  pk: string[];
  cursor: number;
  truncated: boolean;
  reason: "initial" | "resync" | "reconnect";
};

export type RealtimeError = { code: string; message: string; status?: number; retryable: boolean };

export type CursorStore = {
  get(key: string): number | null | undefined | Promise<number | null | undefined>;
  set(key: string, cursor: number | null): void | Promise<void>;
};

type WsLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason?: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
};
export type WebSocketCtor = new (url: string, protocolsOrOptions?: unknown) => WsLike;

export type RealtimeOptions = {
  url: string;
  project: string;
  key: string;
  token?: string;
  WebSocket?: WebSocketCtor;
  now?: () => number;
  random?: () => number;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  refreshToken?: () => Promise<string>;
  cursorStore?: CursorStore;
  heartbeatTimeoutMs?: number;
  backoffBaseMs?: number;
  backoffCapMs?: number;
  /** Live time after which backoff / refresh / resync counters reset (default 10 000). */
  stableLiveMs?: number;
  /** Consecutive resyncs (without a stable period) before `resync_loop` (default 5). */
  maxConsecutiveResyncs?: number;
  /** Force the `?apikey=` browser fallback (default: true iff no WebSocket injected). */
  queryKeyFallback?: boolean;
};

export type SubscribeOptions = {
  table: string;
  filter?: Record<string, string>;
  since?: number;
  limit?: number;
  onChange: (change: RealtimeChange) => void;
  onState?: (event: RealtimeStateEvent) => void;
  onSnapshot?: (snapshot: RealtimeSnapshot) => void;
  onError?: (error: RealtimeError) => void;
};

export type RealtimeSubscription = {
  unsubscribe(): void;
  readonly state: RealtimeStateName;
  /** True while only a truncated snapshot is held. */
  readonly partial?: boolean;
  /** Ignored malformed / foreign change frames so far. */
  readonly dropped?: number;
};
export type Realtime = {
  subscribe(opts: SubscribeOptions): RealtimeSubscription;
  close(): void;
};

const DEFAULT_HEARTBEAT_MS = 45_000;
const DEFAULT_BASE_MS = 500;
const DEFAULT_CAP_MS = 30_000;
const RATE_LIMIT_MIN_MS = 5_000;
const DEFAULT_STABLE_MS = 10_000;
const DEFAULT_MAX_RESYNCS = 5;
const JITTER_FLOOR_MS = 50;
const MAX_SEQ_JUMP = 2 ** 40;

/** Non-cryptographic hash for store keys (never fed secrets). */
function hashKey(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0xdeadbeef;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

/** Upper bound of the jitter window for attempt `n` (exported for tests). */
export function backoffCeiling(attempt: number, base = DEFAULT_BASE_MS, cap = DEFAULT_CAP_MS): number {
  return Math.min(cap, base * 2 ** Math.min(attempt, 30));
}

export function createRealtime(options: RealtimeOptions): Realtime {
  const WS: WebSocketCtor | undefined =
    options.WebSocket ?? (globalThis as { WebSocket?: unknown }).WebSocket as WebSocketCtor | undefined;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const setT = options.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const clearT = options.clearTimeout ?? ((h) => globalThis.clearTimeout(h as never));
  const hbMs = options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_MS;
  const base = options.backoffBaseMs ?? DEFAULT_BASE_MS;
  const cap = options.backoffCapMs ?? DEFAULT_CAP_MS;
  const useQueryKey = options.queryKeyFallback ?? !options.WebSocket;
  const stableMs = options.stableLiveMs ?? DEFAULT_STABLE_MS;
  const maxResyncs = options.maxConsecutiveResyncs ?? DEFAULT_MAX_RESYNCS;
  let token = options.token;
  const secrets = new Set<string>();
  if (options.key) secrets.add(options.key);
  if (token) secrets.add(token);
  let closedAll = false;
  let refreshing: Promise<string> | null = null;
  const subs = new Set<{ stop(): void }>();

  const redact = (text: string): string => {
    let out = text;
    for (const secret of secrets) {
      if (secret) out = out.split(secret).join("[redacted]").split(encodeURIComponent(secret)).join("[redacted]");
    }
    return out;
  };
  const errMessage = (err: unknown): string => redact(err instanceof Error ? err.message : String(err));

  function wsUrl(): string {
    const root = options.url.replace(/\/+$/, "").replace(/^http/i, "ws");
    const path = `${root}/p/${encodeURIComponent(options.project)}/realtime`;
    return useQueryKey ? `${path}?apikey=${encodeURIComponent(options.key)}` : path;
  }

  function refresh(): Promise<string> {
    if (!options.refreshToken) return Promise.reject(new Error("no refreshToken"));
    refreshing ??= options.refreshToken().then(
      (t) => {
        token = t;
        if (t) secrets.add(t);
        refreshing = null;
        return t;
      },
      (e) => {
        refreshing = null;
        throw e;
      },
    );
    return refreshing;
  }

  function subscribe(opts: SubscribeOptions): RealtimeSubscription {
    const filterJson = JSON.stringify(Object.entries(opts.filter ?? {}).sort(([a], [b]) => (a < b ? -1 : 1)));
    const storeKey = `${options.project}:${opts.table}:${hashKey(
      `${options.url.replace(/\/+$/, "")}|${options.project}|${opts.table}|${filterJson}`,
    )}`;
    let state: RealtimeStateName = "connecting";
    let cursor: number | null = opts.since ?? null;
    let attempt = 0;
    let stopped = false;
    let refreshTried = false;
    let resyncs = 0;
    let partial = false;
    let dropped = 0;
    let stableTimer: unknown = null;
    let needsBase = true; // true until snapshot/subscribed of this connection
    let wantResync = false;
    let snapshotReason: RealtimeSnapshot["reason"] = "initial";
    let gen = 0;
    let ws: WsLike | null = null;
    let hbTimer: unknown = null;
    let retryTimer: unknown = null;

    const emitState = (next: RealtimeStateName, extra: Partial<RealtimeStateEvent> = {}) => {
      state = next;
      const ev: RealtimeStateEvent = { state: next, at: now(), ...extra };
      if (ev.reason) ev.reason = redact(ev.reason);
      if (partial) ev.partial = true;
      if (dropped > 0) ev.dropped = dropped;
      try {
        opts.onState?.(ev);
      } catch {
        /* consumer error must not break the machine */
      }
    };
    const emitError = (e: RealtimeError) => {
      try {
        opts.onError?.({ ...e, code: redact(e.code), message: redact(e.message) });
      } catch {
        /* ignore */
      }
    };
    const persist = (value: number | null) => {
      if (!options.cursorStore) return;
      try {
        void Promise.resolve(options.cursorStore.set(storeKey, value)).catch(() => undefined);
      } catch {
        /* ignore */
      }
    };
    const clearTimers = () => {
      if (hbTimer != null) clearT(hbTimer);
      if (retryTimer != null) clearT(retryTimer);
      if (stableTimer != null) clearT(stableTimer);
      hbTimer = retryTimer = stableTimer = null;
    };
    const markStable = () => {
      if (stableTimer != null) clearT(stableTimer);
      stableTimer = null;
      attempt = 0;
      refreshTried = false;
      resyncs = 0;
    };
    const armStable = (myGen: number) => {
      if (stableTimer != null) clearT(stableTimer);
      stableTimer = setT(() => {
        stableTimer = null;
        if (myGen === gen && !stopped) markStable();
      }, stableMs);
    };
    const nextDelay = (minDelay = 0): number => {
      const ceiling = backoffCeiling(attempt, base, cap);
      const jittered = Math.max(JITTER_FLOOR_MS, Math.min(cap, Math.floor(random() * ceiling)));
      attempt += 1;
      return Math.max(minDelay, jittered);
    };
    const dropSocket = () => {
      gen += 1; // invalidate handlers of the old socket
      const old = ws;
      ws = null;
      if (hbTimer != null) clearT(hbTimer);
      if (stableTimer != null) clearT(stableTimer);
      hbTimer = stableTimer = null;
      if (old) {
        old.onopen = old.onmessage = old.onclose = old.onerror = null;
        try {
          old.close(1000, "client");
        } catch {
          /* already closed */
        }
      }
    };
    const terminal = (reason: string, err?: RealtimeError, code?: number) => {
      if (stopped) return;
      stopped = true;
      clearTimers();
      dropSocket();
      subs.delete(handle);
      if (err) emitError(err);
      emitState("closed", { reason, ...(code != null ? { code } : {}) });
    };

    const armHeartbeat = (myGen: number) => {
      if (hbTimer != null) clearT(hbTimer);
      hbTimer = setT(() => {
        hbTimer = null;
        if (myGen === gen && !stopped) lost("heartbeat_timeout");
      }, hbMs);
    };

    /** Socket gone or unusable: back off, then reconnect (resume with cursor). */
    function lost(reason: string, code?: number, minDelay = 0) {
      if (stopped) return;
      dropSocket();
      if (retryTimer != null) clearT(retryTimer);
      const delay = nextDelay(minDelay);
      emitState("degraded", { reason, ...(code != null ? { code } : {}), attempt, delayMs: delay });
      retryTimer = setT(() => {
        retryTimer = null;
        connect();
      }, delay);
    }

    async function onTerminalOrRetryClose(code: number, reason: string) {
      if (code === 4401) {
        // The browser fallback never sends the token, so refreshing cannot help.
        if (options.refreshToken && !useQueryKey && !refreshTried) {
          refreshTried = true;
          emitState("degraded", { reason: "refreshing_token", code });
          try {
            await refresh();
          } catch (err) {
            return terminal(
              "token_refresh_failed",
              { code: "token_refresh_failed", message: errMessage(err), retryable: false },
              code,
            );
          }
          if (stopped) return;
          return lost("token_refreshed", code);
        }
        return terminal("unauthorized", { code: "unauthorized", message: reason || "unauthorized", retryable: false }, code);
      }
      if (code === 4403) {
        return terminal("forbidden", { code: "forbidden", message: reason || "forbidden", retryable: false }, code);
      }
      if (code === 4410) {
        return terminal("project_gone", { code: "project_gone", message: reason || "project gone", retryable: false }, code);
      }
      if (code === 4429) return lost("rate_limited", code, RATE_LIMIT_MIN_MS);
      if (code === 1009) return lost("message_too_large", code);
      if (code === 1013) return lost("backpressure", code);
      return lost("socket_closed", code);
    }

    function beginResync(reason: string) {
      if (stableTimer != null) clearT(stableTimer);
      stableTimer = null;
      resyncs += 1;
      if (resyncs > maxResyncs) {
        return terminal("resync_loop", {
          code: "resync_loop",
          message: `server demanded ${resyncs - 1} consecutive resyncs without a stable period`,
          retryable: false,
        });
      }
      cursor = null;
      persist(null);
      wantResync = true;
      needsBase = true;
      snapshotReason = "resync";
      if (resyncs === 1) {
        emitState("resync", { reason });
        sendSubscribe();
        return;
      }
      const delay = nextDelay();
      emitState("resync", { reason, attempt, delayMs: delay });
      if (retryTimer != null) clearT(retryTimer);
      const myGen = gen;
      retryTimer = setT(() => {
        retryTimer = null;
        if (myGen === gen && !stopped) sendSubscribe();
      }, delay);
    }

    function sendSubscribe() {
      if (!ws) return;
      const msg: Record<string, unknown> = { type: "subscribe", table: opts.table };
      if (opts.filter) msg.filter = opts.filter;
      if (opts.limit != null) msg.limit = opts.limit;
      if (cursor != null && !wantResync) msg.since = cursor;
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        lost(`send_failed:${errMessage(err)}`);
      }
    }

    function onFrame(raw: unknown, myGen: number) {
      let frame: Record<string, unknown>;
      try {
        const text = typeof raw === "string" ? raw : String(raw);
        const parsed = JSON.parse(text) as unknown;
        if (!parsed || typeof parsed !== "object") return;
        frame = parsed as Record<string, unknown>;
      } catch {
        return;
      }
      if (myGen !== gen || stopped) return;
      armHeartbeat(myGen);
      switch (frame.type) {
        case "ping":
          try {
            ws?.send(JSON.stringify({ type: "pong" }));
          } catch {
            /* next heartbeat will catch a dead socket */
          }
          return;
        case "ready":
          sendSubscribe();
          return;
        case "snapshot": {
          if (!Array.isArray(frame.rows)) {
            emitError({ code: "invalid_snapshot", message: "snapshot rows must be an array", retryable: true });
            return lost("invalid_snapshot");
          }
          const snapCursor = Number(frame.cursor);
          cursor = Number.isFinite(snapCursor) ? snapCursor : cursor;
          if (cursor != null) persist(cursor);
          const allRows = frame.rows as Array<Record<string, unknown>>;
          const rows =
            typeof opts.limit === "number" && opts.limit >= 0 ? allRows.slice(0, Math.floor(opts.limit)) : allRows;
          const truncated = frame.truncated === true || rows.length < allRows.length;
          partial = truncated;
          const reason = snapshotReason;
          snapshotReason = "reconnect";
          wantResync = false;
          needsBase = false;
          emitState("live");
          armStable(myGen);
          try {
            opts.onSnapshot?.({
              table: opts.table,
              rows,
              pk: Array.isArray(frame.pk) ? (frame.pk as string[]) : [],
              cursor: cursor ?? 0,
              truncated,
              reason,
            });
          } catch {
            /* consumer error */
          }
          return;
        }
        case "subscribed":
          needsBase = false;
          wantResync = false;
          emitState("live");
          armStable(myGen);
          return;
        case "jord.change": {
          if (needsBase) return; // never before the base
          const seq = frame.seq;
          const rowOk =
            frame.row === undefined || frame.row === null || (typeof frame.row === "object" && !Array.isArray(frame.row));
          const pkOk = frame.pk === undefined || frame.pk === null || typeof frame.pk === "object";
          if (
            frame.table !== opts.table ||
            typeof seq !== "number" ||
            !Number.isSafeInteger(seq) ||
            seq <= 0 ||
            !rowOk ||
            !pkOk ||
            seq > (cursor ?? 0) + MAX_SEQ_JUMP
          ) {
            dropped += 1;
            return;
          }
          if (cursor != null && seq <= cursor) return; // duplicate / replay
          cursor = seq; // gaps are normal (global outbox seq)
          persist(seq);
          markStable();
          try {
            opts.onChange(frame as unknown as RealtimeChange);
          } catch (err) {
            // Delta is NOT redelivered: the cursor already advanced.
            emitError({ code: "callback_error", message: errMessage(err), retryable: false });
          }
          return;
        }
        case "resync":
          return beginResync("server_resync");
        case "error": {
          const status = Number(frame.status);
          const code = String(frame.error ?? "error");
          const safeCode = redact(code);
          if (code === "resync_required" || (status === 409 && code === "resync_required")) {
            return beginResync("cursor_too_old");
          }
          const retryable = status >= 500 || code === "already_subscribed";
          emitError({
            code: safeCode,
            message: String(frame.message ?? code),
            ...(Number.isFinite(status) ? { status } : {}),
            retryable,
          });
          if (retryable) return lost(`server_error:${code}`);
          return terminal(`error:${safeCode}`);
        }
        default:
          return;
      }
    }

    function connect() {
      if (stopped || closedAll) return;
      retryTimer = null;
      if (!WS) {
        return terminal("no_websocket", {
          code: "no_websocket",
          message: "no WebSocket implementation available; pass options.WebSocket",
          retryable: false,
        });
      }
      needsBase = true;
      emitState(wantResync ? "resync" : "connecting", wantResync ? { reason: "resubscribe" } : { attempt });
      dropSocket();
      const myGen = ++gen;
      let sock: WsLike;
      try {
        if (options.WebSocket && !useQueryKey) {
          const headers: Record<string, string> = { "x-jord-key": options.key };
          if (token) headers.authorization = `Bearer ${token}`;
          sock = new WS(wsUrl(), { headers });
        } else {
          sock = new WS(wsUrl());
        }
      } catch (err) {
        return lost(`connect_failed:${errMessage(err)}`);
      }
      ws = sock;
      armHeartbeat(myGen);
      sock.onmessage = (ev) => onFrame(ev.data, myGen);
      sock.onerror = () => {
        /* a close event follows; never surface raw (URL-bearing) errors */
      };
      sock.onclose = (ev) => {
        if (myGen !== gen || stopped) return;
        dropSocketKeepGen();
        void onTerminalOrRetryClose(ev.code, ev.reason ?? "");
      };
    }
    function dropSocketKeepGen() {
      if (hbTimer != null) clearT(hbTimer);
      if (stableTimer != null) clearT(stableTimer);
      hbTimer = stableTimer = null;
      gen += 1;
      ws = null;
    }

    const handle = {
      stop() {
        if (stopped) return;
        stopped = true;
        clearTimers();
        dropSocket();
        subs.delete(handle);
        emitState("closed", { reason: "unsubscribed" });
      },
    };
    subs.add(handle);

    // Initial cursor: caller `since`, else opt-in store (possibly async).
    if (cursor == null && options.cursorStore) {
      let p: Promise<number | null | undefined>;
      try {
        p = Promise.resolve(options.cursorStore.get(storeKey));
      } catch {
        p = Promise.resolve(null);
      }
      void p
        .catch(() => null)
        .then((v) => {
          if (stopped || closedAll) return;
          if (typeof v === "number" && Number.isFinite(v)) cursor = v;
          connect();
        });
    } else {
      connect();
    }

    return {
      unsubscribe: () => handle.stop(),
      get state() {
        return state;
      },
      get partial() {
        return partial;
      },
      get dropped() {
        return dropped;
      },
    };
  }

  return {
    subscribe: (opts) => {
      if (closedAll) throw new Error("realtime client is closed");
      return subscribe(opts);
    },
    close() {
      closedAll = true;
      for (const s of [...subs]) s.stop();
      refreshing = null;
    },
  };
}
