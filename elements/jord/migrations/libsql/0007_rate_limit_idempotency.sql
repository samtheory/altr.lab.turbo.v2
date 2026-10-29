-- jord migration 0007_rate_limit_idempotency
-- Chain parity with Postgres (S0036). libSQL keeps rate limits and
-- idempotency in process memory; these tables stay empty and unused.

CREATE TABLE IF NOT EXISTS jord_rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS jord_rate_limits_window_idx
ON jord_rate_limits (window_start);

CREATE TABLE IF NOT EXISTS jord_idempotency (
  key TEXT NOT NULL,
  principal TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '',
  request_hash TEXT NOT NULL,
  status INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (key, principal)
);

CREATE INDEX IF NOT EXISTS jord_idempotency_expires_idx
ON jord_idempotency (expires_at);
