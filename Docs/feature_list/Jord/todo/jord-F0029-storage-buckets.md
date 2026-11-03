---
title: "jord-F0029 — storage buckets & providers"
feature_id: jord-F0029
description: "Buckets as first-class rows with per-bucket provider config: local, S3, R2, MinIO or custom S3-compatible, managed from Studio"
created: 2026-10-28
updated: 2026-11-03
tags:
  - feature
  - jord
  - todo
  - jord-F0029
  - storage
  - studio
  - buckets
---

# jord-F0029 — storage buckets & providers

> **Status:** Studio shipped (S0066–S0068) · **Id:** `jord-F0029` · Index: [[../INDEX]] · Registry + admin config API shipped · Studio open · [[../done/jord-F0010-blobs|jord-F0010]] · [[../../../tech_space/jord/blobs/README]]

## What

Buckets stop being names in env and become **first-class rows** with their own provider configuration, managed per project in Studio.

### Bucket registry (`jord_buckets`)

| Field | Detail |
|-------|--------|
| Name / slug | Immutable slug used in URLs, keys, and policies |
| Provider | `local` · `s3` · `r2` · `minio` · `s3-compatible` (custom endpoint) — one provider **per bucket**, not per server |
| Connection | Endpoint, region, physical bucket, key prefix, path-style toggle |
| Credentials | Access key / secret / session token — write-only, never returned in JSON or rendered in the browser |
| Access | Public read on/off, per-role read/write (defaults into [[../done/jord-F0008-policies|policy]] at sign time) |
| Limits | Max object size, allowed MIME types, signed-URL TTL (clamped to the existing 1 h cap) |
| Lifecycle | Status (`active` / `paused`), created by/at, last successful write |
| Linked table (optional) | Record table that owns files for row-level attachments; see open question |

Existing installs keep working: buckets without an explicit provider resolve to the env backend (`JORD_STORAGE_BACKEND`), which becomes the **default provider** for new buckets. No byte movement happens implicitly.

### Studio surfaces

- **Storage** menu: contextual sidebar lists buckets with provider badge and object count.
- **New bucket wizard** in the right inspector: provider picker → connection form → **test connection** → save. A failed test never saves a partial bucket.
- **Bucket detail**: drag-and-drop upload with progress, object list (type, size, updated), preview/download, copy signed URL, delete, and a settings tab for the config above.
- **Rotate credentials** per bucket; old credentials stop working immediately.
- **Move local → S3** stays the existing explicit copy-plan + verify + flag flow, now scoped per bucket.

## Acceptance

1. Two buckets with different providers (one local, one S3/MinIO) serve upload/download/delete in the same project.
2. Wrong credentials fail the test with the provider error and no bucket row is written; secrets never appear in any JSON response or client bundle.
3. Uploads above the bucket size limit or with a disallowed MIME type are rejected server-side.
4. A bucket created before this feature (env-backed) still lists and serves its objects unchanged.
5. Deleting an object whose storage delete fails keeps the metadata row and returns the existing `502 storage_delete_failed` contract.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0010-blobs\|jord-F0010]] | Keeps `JordStoragePort`, pending/finalize/GC, signed-URL shape — this adds per-bucket config, not a second storage stack |
| [[jord-F0018-storage-realtime-v2\|jord-F0018]] | Multipart/resumable/uploads + transforms stay there |
| [[jord-F0021-projects-provisioning\|jord-F0021]] | Reuses its secret-at-rest store for provider credentials |
| [[jord-F0023-studio-shell-v2\|jord-F0023]] | Bucket list lives in the contextual sidebar; settings open in the right inspector |

## Open questions

- Where bucket rows live: project database (today’s `jord_blobs` home) vs control plane. Intent: metadata in the **project database**, credentials in the control-plane secret store.
- “Own table” reading: registry rows here, or one linked records table per bucket for row-level attachments. The optional `linked table` field covers the second without a parallel mechanism.
- Whether GCS/Azure adapters are wanted, or only S3-compatible endpoints.

## Out of scope

Per-bucket billing/quota · image transforms · CDN configuration · file versioning.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0066-bucket-registry\|S0066]] — jord_buckets + provider resolution | 2.5–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/done/S0067-bucket-config-api\|S0067]] — config API + credentials + test | 2.5–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/done/S0068-storage-studio-ui\|S0068]] — Studio bucket UI | 3 h | **done** 2026-11-03 |

Queue: [[../../../plan/Jord/phase-03/README]].
