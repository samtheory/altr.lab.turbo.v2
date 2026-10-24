---
title: "Jord-S0025 — Storage v2 (S3 / R2 / MinIO)"
description: "JordStoragePort; Local + S3 adapters; presign; multipart; principal bucket policies"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0025
  - phase-02
  - blobs
  - s3
---

# Jord-S0025 — Storage v2

> Who: **mimir**. **Status: planned** (after S0021 for principal policies). Feature F7. Prior: [[../Jord-S0024/README]]. Next: [[../Jord-S0026/README]].

**Sprint id:** `Jord-S0025`  
**Hats:** **sindri** · **heimdall** · **apollo** · **docs_man**

## Goal

Keep local blobs; add S3-compatible remote storage with presigned URLs and multipart, policies tied to principals.

## In scope

- `JordStoragePort`; keep `LocalStorageAdapter`; add `S3StorageAdapter` via `@aws-sdk/client-s3` (S3 / R2 / MinIO)
- Presigned upload/download; multipart; configurable size limits
- Bucket policies tied to S0021 principals
- Metadata stays in `jord_blobs`

## Out of scope

Hosted embed API · blob CDC beyond existing change paths · new native deps

## File-level change list (expected)

| Area | Paths |
|------|-------|
| Engine/server | storage port + adapters; presign routes |
| Studio | storage settings (endpoint/bucket via server, no secret echo) |
| Docs | `tech_space/jord/blobs` |

## Tests required

Local still default; S3 adapter unit with mocked client; policy deny; size limit; no secrets in health/Studio JSON.

## Definition of Done

- [ ] Local path unchanged for default `file:` labs
- [ ] `@aws-sdk/client-s3` only (no node-gyp)
- [ ] Category `blobs` updated
