-- jord migration 0013_erd_layouts
-- S0062: ERD canvas node positions live in the control plane (per project + schema),
-- never in the project target database.

CREATE TABLE IF NOT EXISTS jord_erd_layouts (
  project_id TEXT NOT NULL,
  schema_name TEXT NOT NULL,
  nodes_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, schema_name),
  FOREIGN KEY (project_id) REFERENCES jord_projects (id)
);
