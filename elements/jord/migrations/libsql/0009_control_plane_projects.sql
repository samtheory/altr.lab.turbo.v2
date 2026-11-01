-- jord migration 0009_control_plane_projects
-- Studio multi-project control plane (S0042). Lives on the server primary DB,
-- never inside a registered project target. Secrets at rest use the AES-GCM
-- port + JORD_MASTER_KEY; API keys are hashed in jord_project_keys only.

CREATE TABLE IF NOT EXISTS jord_projects (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  engine TEXT NOT NULL,
  target TEXT NOT NULL,
  tls_mode TEXT,
  db_user TEXT,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_projects_slug_uidx
ON jord_projects (slug);

CREATE INDEX IF NOT EXISTS jord_projects_status_idx
ON jord_projects (status);

CREATE TABLE IF NOT EXISTS jord_project_keys (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  last4 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  rotated_at INTEGER,
  FOREIGN KEY (project_id) REFERENCES jord_projects (id)
);

CREATE INDEX IF NOT EXISTS jord_project_keys_project_idx
ON jord_project_keys (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS jord_project_keys_project_kind_uidx
ON jord_project_keys (project_id, kind);
