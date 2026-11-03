-- jord migration 0027_blob_derivatives
-- S0082 hardening: image-transform derivatives are marked in metadata (never
-- recognised by key shape). Only the transform service sets these columns.
-- derived_from = original object key; derived_src_etag = original etag the
-- derivative was rendered from (stale detection).

ALTER TABLE jord_blobs ADD COLUMN derived_from TEXT;
ALTER TABLE jord_blobs ADD COLUMN derived_src_etag TEXT;

CREATE INDEX IF NOT EXISTS jord_blobs_derived_from_idx
ON jord_blobs (bucket, derived_from);
