import type { JordDriverPort } from "@altr/jord";

/**
 * Counts one hit against `key` in a window of `windowMs` and returns the
 * count including this hit. The memory store is sync; Postgres is async.
 */
export type RateLimitStore = {
  hit(key: string, windowMs: number): number | Promise<number>;
};

/** In-process buckets. Window opens at the first hit for a key. */
export function createMemoryRateLimitStore(): RateLimitStore {
  const slots = new Map<string, { count: number; reset: number }>();
  return {
    hit(key, windowMs) {
      const now = Date.now();
      const slot = slots.get(key);
      if (!slot || slot.reset <= now) {
        slots.set(key, { count: 1, reset: now + windowMs });
        return 1;
      }
      slot.count += 1;
      return slot.count;
    },
  };
}

/**
 * Shared counters in `jord_rate_limits`. Fixed windows aligned to the DB
 * clock, so every instance agrees on the window. One upsert round trip.
 */
export function createPostgresRateLimitStore(
  jord: JordDriverPort,
): RateLimitStore {
  if (jord.dialect !== "postgres") {
    throw new Error("[@altr/jord-server] postgres rate-limit store needs a postgres port");
  }
  return {
    async hit(key, windowMs) {
      const rows = await jord.query(
        `INSERT INTO jord_rate_limits (bucket, window_start, count)
         VALUES (
           $1,
           (floor(extract(epoch FROM clock_timestamp()) * 1000 / $2::bigint) * $2::bigint)::bigint,
           1
         )
         ON CONFLICT (bucket, window_start)
         DO UPDATE SET count = jord_rate_limits.count + 1
         RETURNING count`,
        [key, windowMs],
      );
      return Number(rows[0]?.count ?? 1);
    },
  };
}
