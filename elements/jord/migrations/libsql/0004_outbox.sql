-- jord migration 0004_outbox

CREATE TABLE IF NOT EXISTS jord_changes (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL,
  pk TEXT NOT NULL,
  old_json TEXT,
  new_json TEXT,
  actor TEXT,
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_changes_seq_idx ON jord_changes (seq);
CREATE INDEX IF NOT EXISTS jord_changes_table_seq_idx ON jord_changes (table_name, seq);

CREATE TABLE IF NOT EXISTS jord_tracked_tables (
  table_name TEXT PRIMARY KEY NOT NULL,
  tracked_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO jord_tracked_tables (table_name, tracked_at)
VALUES ('records', 0);
