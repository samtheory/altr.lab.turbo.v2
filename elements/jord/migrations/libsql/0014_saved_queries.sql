-- jord migration 0014_saved_queries
-- S0064: named SQL snippets stored per project database (user data).

CREATE TABLE IF NOT EXISTS jord_saved_queries (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  sql_text TEXT NOT NULL,
  owner_uid TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_saved_queries_updated_idx
  ON jord_saved_queries (updated_at DESC);

CREATE INDEX IF NOT EXISTS jord_saved_queries_name_idx
  ON jord_saved_queries (name);
