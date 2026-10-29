-- jord migration 0008_listen_watermark
-- Shared contiguous commit watermark + abandoned-seq gaps so N instances
-- agree on readable outbox seqs (S0037). Richer NOTIFY payload for LISTEN
-- clients; payload is a hint only — always re-read jord_changes.

CREATE TABLE IF NOT EXISTS jord_commit_watermark (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  seq BIGINT NOT NULL DEFAULT 0
);

-- Seed to current MAX so upgrades do not walk the whole history on first settle.
INSERT INTO jord_commit_watermark (id, seq)
VALUES (1, COALESCE((SELECT MAX(seq) FROM jord_changes), 0))
ON CONFLICT (id) DO NOTHING;

-- BIGSERIAL gaps from rolled-back inserts; advance walks these without blocking.
CREATE TABLE IF NOT EXISTS jord_changes_abandoned (
  seq BIGINT PRIMARY KEY,
  abandoned_at BIGINT NOT NULL
);

CREATE OR REPLACE FUNCTION jord_changes_notify() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'jord_changes',
    json_build_object(
      'table', NEW.table_name,
      'seq', NEW.seq,
      'txid', txid_current()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
