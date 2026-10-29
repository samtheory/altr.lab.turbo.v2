import type { JordDriverPort } from "@altr/jord";

const NOW_MS = "(extract(epoch FROM clock_timestamp()) * 1000)::bigint";

export type SharedStateSweepResult = {
  skipped?: "not_postgres";
  idempotency: number;
  rateLimits: number;
};

/**
 * Delete expired idempotency rows and dead rate-limit windows (S0036).
 * Postgres only; libSQL keeps both in memory so there is nothing to sweep.
 * No pg_cron: runs on the existing job runner as `shared_state_sweep`.
 *
 * `rateRetainMs` is how long a window row is kept past its start; it must
 * exceed the rate window so a live window is never deleted.
 */
export async function sweepSharedState(
  jord: JordDriverPort,
  opts: { rateRetainMs: number },
): Promise<SharedStateSweepResult> {
  if (jord.dialect !== "postgres") {
    return { skipped: "not_postgres", idempotency: 0, rateLimits: 0 };
  }
  const idem = await jord.query(
    `WITH gone AS (
       DELETE FROM jord_idempotency WHERE expires_at <= ${NOW_MS} RETURNING 1
     ) SELECT count(*)::int AS n FROM gone`,
  );
  const rate = await jord.query(
    `WITH gone AS (
       DELETE FROM jord_rate_limits WHERE window_start < ${NOW_MS} - $1::bigint RETURNING 1
     ) SELECT count(*)::int AS n FROM gone`,
    [opts.rateRetainMs],
  );
  return {
    idempotency: Number(idem[0]?.n ?? 0),
    rateLimits: Number(rate[0]?.n ?? 0),
  };
}
