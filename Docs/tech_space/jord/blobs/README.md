---
title: "Jord — blobs"
description: "Storage v2: local HMAC and S3/R2/MinIO adapters, sign-time policy, pending/finalize/GC"
created: 2026-10-24
updated: 2026-10-26
tags:
  - tech-space
  - jord
  - blobs
  - storage
  - s0025
---

# Jord — blobs

> Who: anyone storing files beside the database. Auth: [[../auth/README]]. Policies: [[../policies/README]].

## Why

Assets should not live inside `records.body`. Metadata stays in SQL so both dialects can list buckets; bytes live behind a `JordStoragePort` (local disk by default, or S3 / R2 / MinIO). Signed URLs are checked against policy **when minted**, not only when later fetched.

## What

### Metadata (`jord_blobs`)

Migration `0006_storage_v2` adds lifecycle columns on top of phase-01 meta:

| Column | Role |
|--------|------|
| `status` | `pending` → `ready` |
| `pending_expires_at` | GC target for abandoned uploads |
| `upload_id` | Multipart id when used |

Ready objects are listed on `GET /blobs/:bucket`. Pending rows are omitted from that list until finalize.

### Adapters

| Backend | Env | Notes |
|---------|-----|--------|
| **local** (default) | `JORD_STORAGE_BACKEND=local` or unset | Bytes under `data/blobs/` (`JORD_BLOBS_ROOT`). Presign returns HMAC URLs with the same JSON shape as S3 |
| **s3** | `JORD_STORAGE_BACKEND=s3` (also accepts `r2` / `minio`) | `@aws-sdk/client-s3` + presigner. One physical bucket (`JORD_S3_BUCKET`); Jord buckets are key prefixes |

Signed-URL TTL defaults to **15 minutes**, hard-capped at **1 hour** (`clampSignTtlSeconds`).

### HTTP

| Method | Path | Role |
|--------|------|------|
| `GET` | `/blobs/buckets` | authenticated |
| `POST` | `/blobs/buckets` `{ name }` | admin |
| `GET` | `/blobs/:bucket` | authenticated (ready only) |
| `PUT` | `/blobs/:bucket/objects/:key` | editor+ (direct upload → `ready`) |
| `POST` | `/blobs/:bucket/objects/:key/sign` | policy at sign time; upload needs write; download needs read |
| `POST` | `/blobs/:bucket/objects/:key/finalize` | editor+ |
| `GET` | `/blobs/:bucket/objects/:key` | authenticated (ready) |
| `DELETE` | `/blobs/:bucket/objects/:key` | editor+ |
| `POST` | `/blobs/copy-plan` | admin dry-run |
| `PUT`/`GET` | `/blobs/signed/:bucket/objects/:key?…` | local HMAC only (no bearer) |

`PresignResult` for both adapters: `{ url, method, headers, expires_at, object, storage }`. Studio must not echo S3 secrets — env only.

### Lifecycle

1. **Sign upload** → insert `pending` meta + return URL  
2. Client **PUT**s bytes to the signed URL (local HMAC or S3)  
3. **Finalize** verifies bytes exist, then sets `ready`  
4. Job kind **`blobs_gc`** deletes expired pending rows and their adapter bytes  

Object-byte I/O stays **off** the serial SQL write queue; only meta mutations enqueue.

**Delete.** Bytes go first, then metadata. `deleteObject` resolves `true` (removed) or `false` (already absent, not an error) and **throws** on a real storage failure. On a throw, `DELETE /blobs/:bucket/objects/:key` logs the error and returns **502** `{ "error": "storage_delete_failed" }`, and keeps the metadata row so a retry works. A delete never reports success while bytes stay in storage. GC keeps a row whose byte delete failed and retries it on the next sweep.

### Local → S3 move plan

Default stays local. Dry-run:

```bash
pnpm --filter @altr/jord-server storage:copy-plan
```

or `POST /blobs/copy-plan` (admin). The plan always reports `delete_local: false` and `switch_requires_explicit_flag: true`. Steps: copy → verify checksums → flip `JORD_STORAGE_BACKEND=s3` → restart. **Do not delete local bytes in the same step as the flip.**

## How

| Piece | Path |
|-------|------|
| Schema + migration | `elements/jord` `schema/blobs.ts`, `migrations/*/0006_storage_v2.sql` |
| Port + adapters | `cloud/jord/src/storage/` (`port`, `local`, `s3`, `lifecycle`, `copy-plan`, `sign-policy`) |
| Routes | `cloud/jord/src/blobs/routes.ts` |
| GC job | `blobs_gc` in `cloud/jord/src/jobs/kinds.ts` |
| Studio | **Storage** → `/storage` (existing BFF; no secrets in JSON) |
| Tests | `cloud/jord/src/blobs/delete-failure.test.ts` (stub storage, file + Postgres) · live S3 `cloud/jord/src/storage/s3-live.test.ts`: sign → PUT → finalize → download → delete against MinIO, gated on `JORD_TEST_S3_ENDPOINT` (+ `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`, optional `_BUCKET`, `_REGION`). CI runs it in the `jord-postgres` job |

MinIO needs path-style addressing: set `JORD_S3_FORCE_PATH_STYLE=1` with `JORD_STORAGE_BACKEND=s3`.

## Example

Editor `POST /blobs/lab/objects/note.txt/sign` `{ "intent":"upload", "content_type":"text/plain" }` → PUT body to `url` → `POST …/finalize`. Denied `jord_blobs` policies return **403** at sign even if meta already exists.

## Not in Jord yet

Automatic cutover without an operator flag · hosted embed API · Studio UI for S3 credential editing (secrets stay in env)
