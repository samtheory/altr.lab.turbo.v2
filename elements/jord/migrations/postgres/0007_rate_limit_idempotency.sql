-- jord migration 0007_rate_limit_idempotency
-- Shared HTTP rate-limit counters and idempotency replay cache (S0036), so N
-- server instances behind one URL enforce one budget and one replay cache.
-- Columns are plain TEXT/BIGINT/INTEGER: no RLS, no user data, DML only.

CREATE TABLE IF NOT EXISTS jord_rate_limits (
  bucket TEXT NOT NULL,
  -- Fixed window start, epoch ms, aligned to the window length (DB clock).
  window_start BIGINT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- Sweeper scans dead windows by age.
CREATE INDEX IF NOT EXISTS jord_rate_limits_window_idx
ON jord_rate_limits (window_start);

CREATE TABLE IF NOT EXISTS jord_idempotency (
  key TEXT NOT NULL,
  principal TEXT NOT NULL,
  -- Informational ("POST /records"); replay identity is (key, principal).
  route TEXT NOT NULL DEFAULT '',
  request_hash TEXT NOT NULL,
  status INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  -- Epoch ms (DB clock). TTL index below drives the sweeper.
  expires_at BIGINT NOT NULL,
  PRIMARY KEY (key, principal)
);

CREATE INDEX IF NOT EXISTS jord_idempotency_expires_idx
ON jord_idempotency (expires_at);
