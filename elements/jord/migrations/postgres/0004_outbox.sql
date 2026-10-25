-- jord migration 0004_outbox

CREATE TABLE IF NOT EXISTS jord_changes (
  seq BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL,
  pk TEXT NOT NULL,
  old_json TEXT,
  new_json TEXT,
  actor TEXT,
  ts BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_changes_seq_idx ON jord_changes (seq);
CREATE INDEX IF NOT EXISTS jord_changes_table_seq_idx ON jord_changes (table_name, seq);

CREATE TABLE IF NOT EXISTS jord_tracked_tables (
  table_name TEXT PRIMARY KEY NOT NULL,
  tracked_at BIGINT NOT NULL
);

INSERT INTO jord_tracked_tables (table_name, tracked_at)
VALUES ('records', 0)
ON CONFLICT (table_name) DO NOTHING;

-- Notify listeners with seq only (8 KB pg_notify limit). External writers
-- that insert into jord_changes should also call pg_notify('jord_changes', seq::text).
CREATE OR REPLACE FUNCTION jord_changes_notify() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('jord_changes', NEW.seq::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jord_changes_notify_trg ON jord_changes;
CREATE TRIGGER jord_changes_notify_trg
  AFTER INSERT ON jord_changes
  FOR EACH ROW EXECUTE PROCEDURE jord_changes_notify();
