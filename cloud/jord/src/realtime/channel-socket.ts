/**
 * S0083 — WebSocket handlers for one presence/broadcast channel.
 * Authorization happens before upgrade (app.ts); this file owns the socket
 * lifecycle: hub membership, token expiry, periodic session/policy re-check,
 * server ping, and teardown on close/error.
 */

import { PRESENCE_CLOSE, type ChannelMember, type PresenceHub } from "./channels.js";

export type GuardVerdict = { ok: true } | { ok: false; code: number; reason: string };

export type SocketLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

export function channelSocketHandlers(opts: {
  hub: PresenceHub;
  channel: string;
  accessExp: number | null;
  /** Re-check cadence (session live + channel policy). */
  recheckMs: number;
  recheck: () => Promise<GuardVerdict>;
  pingMs?: number;
}) {
  let member: ChannelMember | null = null;
  let expTimer: ReturnType<typeof setTimeout> | null = null;
  let recheckTimer: ReturnType<typeof setInterval> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let done = false;

  function teardown(): void {
    if (done) return;
    done = true;
    if (expTimer) clearTimeout(expTimer);
    if (recheckTimer) clearInterval(recheckTimer);
    if (pingTimer) clearInterval(pingTimer);
    expTimer = recheckTimer = pingTimer = null;
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
      const res = opts.hub.connect(opts.channel, {
        send: (text) => ws.send(text),
        close: (code, reason) => {
          try {
            ws.close(code, reason);
          } catch {
            /* already closed */
          }
        },
      });
      if (!res.ok) {
        shut(ws, PRESENCE_CLOSE.full, res.error);
        return;
      }
      member = res.member;
      if (opts.accessExp != null) {
        expTimer = setTimeout(
          () => shut(ws, PRESENCE_CLOSE.tokenExpired, "token_expired"),
          Math.max(0, opts.accessExp - Date.now()),
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
      if (!member) return;
      if (typeof evt.data !== "string") {
        try {
          ws.send(
            JSON.stringify({
              type: "error",
              code: 400,
              error: "text_only",
              message: "binary frames are not accepted",
            }),
          );
        } catch {
          /* closed */
        }
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
