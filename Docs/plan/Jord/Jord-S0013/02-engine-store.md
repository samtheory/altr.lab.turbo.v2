---
title: "Phase 2 — blob store on JordDriverPort"
description: "Schema jord_blobs, disk helpers, adapter methods for both dialects"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0013
  - blobs
  - engine
---

# Phase 2 — blob store on JordDriverPort

> Who: **saga** (schema / SQL) · **sindri** (adapters + disk).

Sprint index: [[README]] · Contract: [[01-contract]]

## Status

**done** (2026-10-24)

## Goal

Persist blob **metadata** through `JordDriverPort` on libSQL and Postgres; own **byte** I/O as a small store module used by the server (not the browser).

## Work

| Piece | Notes |
|-------|--------|
| Schema | Idempotent `CREATE TABLE jord_blobs` + unique `(bucket, key)` on both adapters (same pattern as other `jord_*` tables) |
| Port methods | e.g. `listBlobBuckets`, `ensureBlobBucket`, `listBlobs`, `getBlobMeta`, `upsertBlobMeta`, `deleteBlobMeta` — names may match house style |
| Disk module | `resolveBlobsRoot()`, `ensureBucketDir`, `writeObject`, `readObject`, `deleteObject`, `sha256` — under `elements/jord` or `cloud/jord` (prefer **server** owns disk if port stays DB-only; document choice in as-built) |
| Init | Recursive mkdir for `data/blobs` when store is first used |
| Tests | Unit tests for key sanitization, upsert/list/delete meta (libSQL in-memory or temp file); Postgres behind existing opt-in env |

### Recommended split

| Layer | Owns |
|-------|------|
| `@altr/jord` | `jord_blobs` DDL + CRUD on metadata |
| `@altr/jord-server` | Multipart parse, size caps, disk paths, enqueueWrite wrapping meta + file ops |

If a shared `BlobStore` helper lives in `@altr/jord`, keep it free of Hono.

## Done when

- [x] `jord_blobs` exists after client open (both dialects)
- [x] Metadata round-trip tests green
- [x] Path traversal rejected in tests
- [x] No browser-facing imports of the disk module from Studio
