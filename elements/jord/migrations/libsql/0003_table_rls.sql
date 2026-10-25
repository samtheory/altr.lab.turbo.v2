-- jord migration 0003_table_rls

CREATE TABLE IF NOT EXISTS jord_table_rls (
  table_name TEXT PRIMARY KEY NOT NULL,
  rls_enabled INTEGER NOT NULL DEFAULT 0,
  owner_column TEXT,
  updated_at INTEGER NOT NULL
);
