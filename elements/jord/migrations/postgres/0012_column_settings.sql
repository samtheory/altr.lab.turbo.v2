-- jord migration 0012_column_settings
-- S0053: per-column settings (validation rules, auto-update, comment, …)
-- stored as JSON so Studio/API rules round-trip without opaque SQL-only.

CREATE TABLE IF NOT EXISTS jord_column_settings (
  schema_name TEXT NOT NULL DEFAULT 'public',
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (schema_name, table_name, column_name)
);
