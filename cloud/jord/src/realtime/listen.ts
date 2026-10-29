import { Client } from "pg";

import type { RealtimeBus } from "./bus.js";
import type { Outbox } from "./outbox.js";

export const JORD_CHANGES_CHANNEL = "jord_changes";

export type NotifyPayload = {
  table?: string;
  seq: number;
  txid?: number;
};

export type OutboxListenBridge = {
  /** Mark a seq published by this process so the LISTEN echo is skipped. */
  noteLocalSeq: (seq: number) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

export type OutboxListenOptions = {
  connectionString: string;
  outbox: Outbox;
  bus: RealtimeBus;
  /** Initial backoff ms (default 250). Doubles up to maxBackoffMs. */
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  log?: (message: string, err?: unknown) => void;
};

/**
 * Parse NOTIFY payload. Accepts legacy plain seq (`"42"`) and JSON
 * `{ table, seq, txid }` from migration 0008.
 */
export function parseNotifyPayload(raw: string): NotifyPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const seq = Number(trimmed);
    return Number.isSafeInteger(seq) && seq > 0 ? { seq } : null;
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      table?: unknown;
      seq?: unknown;
      txid?: unknown;
    };
    const seq = Number(parsed.seq);
    if (!Number.isSafeInteger(seq) || seq <= 0) return null;
    const out: NotifyPayload = { seq };
    if (typeof parsed.table === "string" && parsed.table.length > 0) {
      out.table = parsed.table;
    }
    if (typeof parsed.txid === "number" && Number.isFinite(parsed.txid)) {
      out.txid = parsed.txid;
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * One long-lived LISTEN connection per process. On NOTIFY (or reconnect),
 * re-reads committed outbox rows after `lastSeenSeq` and publishes to the
 * in-process bus. Payload fields are never trusted for row content.
 */
export function createOutboxListenBridge(
  opts: OutboxListenOptions,
): OutboxListenBridge {
  const log =
    opts.log ??
    ((message: string, err?: unknown) => {
      if (err !== undefined) {
        console.error(`[@altr/jord-server] ${message}`, err);
      } else {
        console.error(`[@altr/jord-server] ${message}`);
      }
    });
  const initialBackoff = opts.initialBackoffMs ?? 250;
  const maxBackoff = opts.maxBackoffMs ?? 10_000;

  let client: Client | null = null;
  let stopped = false;
  let starting: Promise<void> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffMs = initialBackoff;
  let lastSeenSeq = 0;
  const localPending = new Set<number>();
  const delivered = new Set<number>();
  let catchupChain: Promise<void> = Promise.resolve();

  function markDelivered(seq: number): void {
    delivered.add(seq);
    if (seq > lastSeenSeq) lastSeenSeq = seq;
    if (delivered.size > 2_048) {
      for (const s of delivered) {
        if (s < lastSeenSeq - 1_024) delivered.delete(s);
      }
    }
  }

  function noteLocalSeq(seq: number): void {
    if (!Number.isSafeInteger(seq) || seq <= 0) return;
    localPending.add(seq);
    markDelivered(seq);
  }

  async function publishRow(seq: number): Promise<void> {
    if (localPending.has(seq)) {
      localPending.delete(seq);
      markDelivered(seq);
      return;
    }
    if (delivered.has(seq)) return;
    const row = await opts.outbox.getBySeq(seq);
    if (!row) return;
    opts.bus.publish(opts.outbox.toEvent(row));
    markDelivered(row.seq);
  }

  /**
   * Live NOTIFY: load the hinted seq (row is committed). Reconnect: drain
   * committed rows after lastSeen (ignore shared watermark — same as local
   * bus.publish after settle, which is not watermark-gated).
   */
  async function deliverCatchup(hint?: NotifyPayload): Promise<void> {
    if (hint) {
      await publishRow(hint.seq);
      return;
    }
    const rows = await opts.outbox.listAfter(lastSeenSeq, {
      ignoreWatermark: true,
    });
    for (const row of rows) {
      if (localPending.has(row.seq)) {
        localPending.delete(row.seq);
        markDelivered(row.seq);
        continue;
      }
      if (delivered.has(row.seq)) continue;
      opts.bus.publish(opts.outbox.toEvent(row));
      markDelivered(row.seq);
    }
  }

  function enqueueCatchup(hint?: NotifyPayload): void {
    catchupChain = catchupChain
      .then(() => deliverCatchup(hint))
      .catch((err) => {
        log("realtime LISTEN catchup failed", err);
      });
  }

  function clearReconnect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect(): void {
    if (stopped || reconnectTimer) return;
    const wait = backoffMs;
    backoffMs = Math.min(backoffMs * 2, maxBackoff);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, wait);
  }

  async function detachClient(): Promise<void> {
    const c = client;
    client = null;
    if (!c) return;
    c.removeAllListeners("notification");
    c.removeAllListeners("error");
    c.removeAllListeners("end");
    try {
      await c.end();
    } catch {
      /* already closed */
    }
  }

  async function connect(): Promise<void> {
    if (stopped) return;
    await detachClient();
    const next = new Client({
      connectionString: opts.connectionString,
      application_name: "jord-realtime-listen",
    });
    next.on("notification", (msg) => {
      if (msg.channel !== JORD_CHANGES_CHANNEL) return;
      const payload = parseNotifyPayload(msg.payload ?? "");
      if (!payload) {
        log(`realtime LISTEN ignored bad payload: ${msg.payload ?? ""}`);
        return;
      }
      enqueueCatchup(payload);
    });
    next.on("error", (err) => {
      log("realtime LISTEN connection error", err);
      if (client === next) {
        client = null;
        scheduleReconnect();
      }
    });
    next.on("end", () => {
      if (stopped) return;
      if (client === next) {
        client = null;
        log("realtime LISTEN connection dropped; reconnecting");
        scheduleReconnect();
      }
    });
    try {
      await next.connect();
      await next.query(`LISTEN ${JORD_CHANGES_CHANNEL}`);
      client = next;
      backoffMs = initialBackoff;
      enqueueCatchup();
    } catch (err) {
      await next.end().catch(() => undefined);
      log("realtime LISTEN connect failed", err);
      scheduleReconnect();
    }
  }

  async function start(): Promise<void> {
    if (stopped) return;
    if (starting) return starting;
    starting = connect().finally(() => {
      starting = null;
    });
    return starting;
  }

  async function stop(): Promise<void> {
    stopped = true;
    clearReconnect();
    await catchupChain.catch(() => undefined);
    await detachClient();
    localPending.clear();
    delivered.clear();
  }

  return { noteLocalSeq, start, stop };
}
