import type { JordDriverPort } from "@altr/jord";

import type { IdempotencyLookup, IdempotencyStore } from "./store.js";

/** DB clock in epoch ms, so instances with skewed clocks agree on expiry. */
const NOW_MS = "(extract(epoch FROM clock_timestamp()) * 1000)::bigint";

function parseStored(raw: unknown): unknown {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Idempotency replay cache in `jord_idempotency` (Postgres only). Two
 * instances on one database share it, so a replay hits wherever it lands.
 *
 * A row is keyed by (key, principal), like the memory store. An expired row
 * reads as a miss and is overwritten by the next `remember`; the sweeper job
 * deletes the rest.
 */
export function createPostgresIdempotencyStore(
  jord: JordDriverPort,
  ttlMs: number,
): IdempotencyStore {
  if (jord.dialect !== "postgres") {
    throw new Error("[@altr/jord-server] postgres idempotency store needs a postgres port");
  }

  return {
    async lookup(key, principalKey, bodyHash): Promise<IdempotencyLookup> {
      const rows = await jord.query(
        `SELECT request_hash, status, response_json
         FROM jord_idempotency
         WHERE key = $1 AND principal = $2 AND expires_at > ${NOW_MS}
         LIMIT 1`,
        [key, principalKey],
      );
      const row = rows[0];
      if (!row) return { kind: "miss" };
      if (String(row.request_hash) !== bodyHash) return { kind: "conflict" };
      return {
        kind: "hit",
        status: Number(row.status),
        body: parseStored(row.response_json),
      };
    },

    async remember(key, principalKey, bodyHash, response, route = "") {
      // First writer wins while the row is live; an expired row is replaced.
      await jord.query(
        `INSERT INTO jord_idempotency
           (key, principal, route, request_hash, status, response_json, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, ${NOW_MS} + $7::bigint)
         ON CONFLICT (key, principal) DO UPDATE SET
           route = EXCLUDED.route,
           request_hash = EXCLUDED.request_hash,
           status = EXCLUDED.status,
           response_json = EXCLUDED.response_json,
           expires_at = EXCLUDED.expires_at
         WHERE jord_idempotency.expires_at <= ${NOW_MS}`,
        [
          key,
          principalKey,
          route,
          bodyHash,
          response.status,
          JSON.stringify(response.body ?? null),
          ttlMs,
        ],
      );
    },
  };
}
