-- jord migration 0011_schema_scope
-- S0049: user tables are addressed by (schema_name, table_name). SQLite cannot
-- alter a primary key, so both tables are rebuilt. libSQL has one schema: main.
-- jord_policies / jord_triggers / jord_changes stay table_name-only for now.

CREATE TABLE jord_table_rls_v2 (
  schema_name TEXT NOT NULL DEFAULT 'main',
  table_name TEXT NOT NULL,
  rls_enabled INTEGER NOT NULL DEFAULT 0,
  owner_column TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (schema_name, table_name)
);

INSERT INTO jord_table_rls_v2 (schema_name, table_name, rls_enabled, owner_column, updated_at)
SELECT 'main', table_name, rls_enabled, owner_column, updated_at FROM jord_table_rls;

DROP TABLE jord_table_rls;
ALTER TABLE jord_table_rls_v2 RENAME TO jord_table_rls;

CREATE TABLE jord_tracked_tables_v2 (
  schema_name TEXT NOT NULL DEFAULT 'main',
  table_name TEXT NOT NULL,
  tracked_at INTEGER NOT NULL,
  PRIMARY KEY (schema_name, table_name)
);

INSERT INTO jord_tracked_tables_v2 (schema_name, table_name, tracked_at)
SELECT 'main', table_name, tracked_at FROM jord_tracked_tables;

DROP TABLE jord_tracked_tables;
ALTER TABLE jord_tracked_tables_v2 RENAME TO jord_tracked_tables;
