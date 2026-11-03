-- jord migration 0023_multipart
-- S0081: multipart / resumable upload sessions. `id` is an unguessable
-- 256-bit hex token bound to bucket + object_key + principal. Part state lives
-- in the store (S3 ListParts / local .multipart dir), not in SQL.

CREATE TABLE IF NOT EXISTS jord_uploads (
  id TEXT PRIMARY KEY NOT NULL,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  principal TEXT NOT NULL,
  content_type TEXT NOT NULL,
  total_size INTEGER NOT NULL,
  part_size INTEGER NOT NULL,
  parts_expected INTEGER NOT NULL,
  provider_upload_id TEXT NOT NULL,
  storage_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_uploads_expires_idx
ON jord_uploads (expires_at);
