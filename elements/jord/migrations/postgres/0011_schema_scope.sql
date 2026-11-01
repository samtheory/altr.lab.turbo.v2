-- jord migration 0011_schema_scope
-- S0049: user tables are addressed by (schema_name, table_name).
-- Existing rows belong to `public`. jord_policies / jord_triggers /
-- jord_changes stay table_name-only for now.

ALTER TABLE jord_table_rls
  ADD COLUMN IF NOT EXISTS schema_name TEXT NOT NULL DEFAULT 'public';
ALTER TABLE jord_table_rls DROP CONSTRAINT IF EXISTS jord_table_rls_pkey;
ALTER TABLE jord_table_rls ADD PRIMARY KEY (schema_name, table_name);

ALTER TABLE jord_tracked_tables
  ADD COLUMN IF NOT EXISTS schema_name TEXT NOT NULL DEFAULT 'public';
ALTER TABLE jord_tracked_tables DROP CONSTRAINT IF EXISTS jord_tracked_tables_pkey;
ALTER TABLE jord_tracked_tables ADD PRIMARY KEY (schema_name, table_name);
