-- jord migration 0003_table_rls

CREATE TABLE IF NOT EXISTS jord_table_rls (
  table_name TEXT PRIMARY KEY NOT NULL,
  rls_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  owner_column TEXT,
  updated_at BIGINT NOT NULL
);
