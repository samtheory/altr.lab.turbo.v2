/**
 * S0083 — WebSocket handlers for one presence/broadcast channel.
 * Authorization happens before upgrade (app.ts); this file owns the socket
 * lifecycle: hub membership, token expiry, periodic session/policy re-check,
 * server ping, and teardown on close/error.
 */

import {
  MAX_TIMER_MS,
  PRESENCE_CLOSE,
  type ChannelMember,
  type ConnectIdentity,
  type PresenceHub,
} from "./channels.js";

export type GuardVerdict = { ok: true } | { ok: false; code: number; reason: string };

export type SocketLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  /** Underlying `ws` socket (Hono WSContext.raw); read for bufferedAmount. */
  raw?: unknown;
};

/**
 * `setTimeout` that survives delays above 2^31-1 ms (Node fires those after
 * 1 ms): sleeps in clamped chunks and re-arms until `atMs`.
 */
export function setDeadline(atMs: number, fn: () => void): { clear(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cleared = false;
  const arm = (): void => {
    if (cleared) return;
    const left = atMs - Date.now();
    if (left <= 0) {
      timer = null;
      fn();
      return;
    }
    timer = setTimeout(arm, Math.min(left, MAX_TIMER_MS));
  };
  arm();
  return {
    clear() {
      cleared = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export function channelSocketHandlers(opts: {
  hub: PresenceHub;
  channel: string;
  /** Cap key + server-stamped kind for this socket. */
  identity: ConnectIdentity;
  accessExp: number | null;
  /** Re-check cadence (session live + channel policy). */
  recheckMs: number;
  recheck: () => Promise<GuardVerdict>;
  pingMs?: number;
}) {
  let member: ChannelMember | null = null;
  let expTimer: { clear(): void } | null = null;
  let recheckTimer: ReturnType<typeof setInterval> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let done = false;

  function teardown(): void {
    if (done) return;
    done = true;
    expTimer?.clear();
    if (recheckTimer) clearInterval(recheckTimer);
    if (pingTimer) clearInterval(pingTimer);
    expTimer = null;
    recheckTimer = pingTimer = null;
    // Presence is removed before the socket is closed: no stale member.
    member?.leave();
    member = null;
  }

  function shut(ws: SocketLike, code: number, reason: string): void {
    teardown();
    try {
      ws.close(code, reason);
    } catch {
      /* already closed */
    }
  }

  return {
    onOpen(_evt: unknown, ws: SocketLike) {
      if (opts.accessExp != null && Date.now() >= opts.accessExp) {
        shut(ws, PRESENCE_CLOSE.tokenExpired, "token_expired");
        return;
      }
      const res = opts.hub.connect(
        opts.channel,
        {
          send: (text) => ws.send(text),
          close: (code, reason) => {
            try {
              ws.close(code, reason);
            } catch {
              /* already closed */
            }
          },
          bufferedAmount: () => {
            const raw = ws.raw as { bufferedAmount?: unknown } | undefined;
            return typeof raw?.bufferedAmount === "number" ? raw.bufferedAmount : 0;
          },
        },
        opts.identity,
      );
      if (!res.ok) {
        shut(
          ws,
          PRESENCE_CLOSE.full,
          res.error === "principal_full" ? "too_many_connections" : res.error,
        );
        return;
      }
      member = res.member;
      if (opts.accessExp != null) {
        expTimer = setDeadline(opts.accessExp, () =>
          shut(ws, PRESENCE_CLOSE.tokenExpired, "token_expired"),
        );
      }
      let inflight = false;
      recheckTimer = setInterval(() => {
        if (inflight || done) return;
        inflight = true;
        void opts
          .recheck()
          .then((verdict) => {
            if (!verdict.ok && !done) shut(ws, verdict.code, verdict.reason);
          })
          .catch(() => {
            if (!done) shut(ws, PRESENCE_CLOSE.accessRevoked, "recheck_failed");
          })
          .finally(() => {
            inflight = false;
          });
      }, opts.recheckMs);
      pingTimer = setInterval(() => {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          /* closed */
        }
      }, opts.pingMs ?? 15_000);
    },
    onMessage(evt: { data: unknown }, ws: SocketLike) {
      void ws;
      if (!member) return;
      // Binary costs a token + strike in the hub and does not refresh lastSeen.
      if (typeof evt.data !== "string") {
        member.receiveBinary();
        return;
      }
      member.receive(evt.data);
    },
    onClose() {
      teardown();
    },
    onError() {
      teardown();
    },
  };
}
