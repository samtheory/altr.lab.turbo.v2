import { Client } from "pg";

import { parsePeerMessage, type PeerMessage, type PeerTransport } from "./channels.js";

/** NOTIFY channel for presence/broadcast peer messages (S0083). */
export const JORD_PRESENCE_CHANNEL = "jord_presence";

/** Postgres NOTIFY payloads must stay under 8000 bytes. */
const MAX_NOTIFY_BYTES = 7_900;

export type PgPeerTransport = PeerTransport & {
  start(): Promise<void>;
  stop(): Promise<void>;
};

/**
 * One dedicated connection per process: LISTEN for peers and NOTIFY to
 * publish. Ephemeral by design: while disconnected, publishes are dropped
 * (remote presence self-heals through announce + TTL). Reconnects with
 * backoff. Own messages echo back and are skipped by the hub's origin check.
 */
export function createPgPeerTransport(opts: {
  connectionString: string;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  log?: (message: string, err?: unknown) => void;
}): PgPeerTransport {
  const log =
    opts.log ??
    ((message: string, err?: unknown) => {
      if (err !== undefined) console.error(`[@altr/jord-server] ${message}`, err);
      else console.error(`[@altr/jord-server] ${message}`);
    });
  const initialBackoff = opts.initialBackoffMs ?? 250;
  const maxBackoff = opts.maxBackoffMs ?? 10_000;
  const listeners = new Set<(msg: PeerMessage) => void>();
  let client: Client | null = null;
  let stopped = false;
  let backoffMs = initialBackoff;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect(): void {
    if (stopped || reconnectTimer) return;
    const wait = backoffMs;
    backoffMs = Math.min(backoffMs * 2, maxBackoff);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, wait);
    reconnectTimer.unref?.();
  }

  async function detach(): Promise<void> {
    const c = client;
    client = null;
    if (!c) return;
    c.removeAllListeners();
    await c.end().catch(() => undefined);
  }

  async function connect(): Promise<void> {
    if (stopped) return;
    await detach();
    const next = new Client({
      connectionString: opts.connectionString,
      application_name: "jord-presence",
    });
    next.on("notification", (msg) => {
      if (msg.channel !== JORD_PRESENCE_CHANNEL || !msg.payload) return;
      let parsed: PeerMessage | null = null;
      try {
        parsed = parsePeerMessage(JSON.parse(msg.payload) as unknown);
      } catch {
        parsed = null;
      }
      if (!parsed) return;
      for (const l of listeners) {
        try {
          l(parsed);
        } catch (err) {
          log("presence peer listener failed", err);
        }
      }
    });
    next.on("error", (err) => {
      log("presence LISTEN connection error", err);
      if (client === next) {
        client = null;
        scheduleReconnect();
      }
    });
    next.on("end", () => {
      if (!stopped && client === next) {
        client = null;
        scheduleReconnect();
      }
    });
    try {
      await next.connect();
      await next.query(`LISTEN ${JORD_PRESENCE_CHANNEL}`);
      client = next;
      backoffMs = initialBackoff;
    } catch (err) {
      await next.end().catch(() => undefined);
      log("presence LISTEN connect failed", err);
      scheduleReconnect();
    }
  }

  return {
    publish(msg) {
      const c = client;
      if (!c) return;
      const text = JSON.stringify(msg);
      if (Buffer.byteLength(text, "utf8") > MAX_NOTIFY_BYTES) {
        log("presence peer message dropped: over NOTIFY size");
        return;
      }
      void c
        .query("SELECT pg_notify($1, $2)", [JORD_PRESENCE_CHANNEL, text])
        .catch((err: unknown) => log("presence NOTIFY failed", err));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async start() {
      stopped = false;
      await connect();
    },
    async stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      listeners.clear();
      await detach();
    },
  };
}
