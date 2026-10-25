-- jord migration 0006_storage_v2
-- Pending/finalize lifecycle for object storage (S0025).

ALTER TABLE jord_blobs ADD COLUMN status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE jord_blobs ADD COLUMN pending_expires_at INTEGER;
ALTER TABLE jord_blobs ADD COLUMN upload_id TEXT;

CREATE INDEX IF NOT EXISTS jord_blobs_pending_expires_idx
ON jord_blobs (status, pending_expires_at);
