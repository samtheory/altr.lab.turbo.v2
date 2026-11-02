---
title: "Jord — blobs"
description: "Storage v2 + bucket registry (S0066) + admin config API with encrypted credentials (S0067)"
created: 2026-10-24
updated: 2026-11-02
tags:
  - tech-space
  - jord
  - blobs
  - storage
  - s0025
  - s0066
  - s0067
---

# Jord — blobs

> Who: anyone storing files beside the database. Auth: [[../auth/README]]. Policies: [[../policies/README]].

## Why

Assets should not live inside `records.body`. Metadata stays in SQL so both dialects can list buckets; bytes live behind a `JordStoragePort` (local disk by default, or S3 / R2 / MinIO). Signed URLs are checked against policy **when minted**, not only when later fetched. From **S0066**, each Jord bucket can pick its own provider instead of one global `JORD_STORAGE_BACKEND`. **S0067** adds the admin config API so credentials stay write-only and encrypted at rest.

## What

### Bucket registry (`jord_buckets`) — S0066 / S0067

Migration `0015_buckets_registry` adds first-class bucket rows. `jord_blobs.bucket` stays the object join key.

| Field | Role |
|-------|------|
| `name` | Immutable slug (same rules as blob bucket names) |
| `provider` | `local` · `s3` · `r2` · `minio` · `s3-compatible` |
| Connection | `endpoint`, `region`, `physical_bucket`, `key_prefix`, `force_path_style` |
| Credentials | `access_key_sealed` / `secret_key_sealed` / `session_token_sealed` — AES-GCM via control-plane `SecretPort` (S0067); env-backed rows leave them null |
| Limits | `max_object_bytes`, `allowed_mime_types` (JSON array), `sign_ttl_seconds` (still hard-capped at 1 h) |
| Access / lifecycle | `public_read`, `status` (`active`/`paused`), optional `linked_table`, `last_write_at` |

**Resolution.** `createBucketResolver` → `resolveBucket(name)`:

1. No row → env port from `createStorageFromEnv` (unchanged behaviour for pre-registry buckets).
2. Row present → build (or reuse) a port from provider + connection fields; **unseal** sealed credentials when present (else env keys). Cache key includes sealed-cred fingerprint so rotation drops the old port.
3. `POST /blobs/buckets` **materializes** a row with `provider =` env default when missing.

Size / MIME / TTL checks use the resolved bucket limits at PUT, sign, and local signed PUT.

### Admin bucket config — S0067

Admin-only (`operator` + `admin`). Failed probes write **no** row. Responses never include `access_key` / `secret_key` / sealed columns — only `configured` plus access-key prefix/last4.

| Method | Path | Role |
|--------|------|------|
| `GET` | `/admin/buckets` | list public bucket configs |
| `POST` | `/admin/buckets` | validate → probe → seal → insert |
| `GET` | `/admin/buckets/:name` | one bucket |
| `PATCH` | `/admin/buckets/:name` | connection/limits (credentials → `/rotate`) |
| `POST` | `/admin/buckets/:name/test` | probe only (no save) |
| `POST` | `/admin/buckets/:name/rotate` | probe new keys → rotate seals → clear port cache |
| `POST` | `/admin/buckets/:name/pause` · `…/resume` | status flip |

Provider matrix: minio/`s3-compatible` need endpoint + physical bucket (path-style default true); s3/r2 need region + physical bucket (r2 also needs endpoint); `local` needs no credentials.

### Metadata (`jord_blobs`)

Migration `0006_storage_v2` adds lifecycle columns on top of phase-01 meta:

| Column | Role |
|--------|------|
| `status` | `pending` → `ready` |
| `pending_expires_at` | GC target for abandoned uploads |
| `upload_id` | Multipart id when used |

Ready objects are listed on `GET /blobs/:bucket`. Pending rows are omitted from that list until finalize.

### Adapters

| Backend | Env / row | Notes |
|---------|-----------|--------|
| **local** (default) | `JORD_STORAGE_BACKEND=local` or unset · or `provider=local` | Bytes under `data/blobs/` (`JORD_BLOBS_ROOT`). Presign returns HMAC URLs with the same JSON shape as S3 |
| **s3 family** | `JORD_STORAGE_BACKEND=s3` (also `r2` / `minio`) · or matching `provider` | `@aws-sdk/client-s3` + presigner. Physical bucket from row or `JORD_S3_BUCKET`; Jord bucket names are key prefixes |

Signed-URL TTL defaults to **15 minutes**, hard-capped at **1 hour** (`clampSignTtlSeconds`); a bucket row may set a lower ceiling.

### HTTP

| Method | Path | Role |
|--------|------|------|
| `GET` | `/blobs/buckets` | authenticated (names only; unchanged) |
| `POST` | `/blobs/buckets` `{ name }` | admin (materialize env-default row) |
| `GET`/`POST`/`PATCH`… | `/admin/buckets…` | admin config — see table above (S0067) |
| `GET` | `/blobs/:bucket` | authenticated (ready only) |
| `PUT` | `/blobs/:bucket/objects/:key` | editor+ (direct upload → `ready`) |
| `POST` | `/blobs/:bucket/objects/:key/sign` | policy at sign time; upload needs write; download needs read |
| `POST` | `/blobs/:bucket/objects/:key/finalize` | editor+ |
| `GET` | `/blobs/:bucket/objects/:key` | authenticated (ready) |
| `DELETE` | `/blobs/:bucket/objects/:key` | editor+ |
| `POST` | `/blobs/copy-plan` | admin dry-run |
| `PUT`/`GET` | `/blobs/signed/:bucket/objects/:key?…` | local HMAC only (no bearer) |

`PresignResult` for both adapters: `{ url, method, headers, expires_at, object, storage }`. Studio must not echo S3 secrets — admin JSON never includes them either.

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
| Schema + migrations | `elements/jord` `schema/blobs.ts`, `schema/buckets.ts`, `migrations/*/0006_storage_v2.sql`, `migrations/*/0015_buckets_registry.sql` |
| Port + adapters | `cloud/jord/src/storage/` (`port`, `local`, `s3`, `lifecycle`, `copy-plan`, `sign-policy`) |
| Bucket registry + resolve | `cloud/jord/src/storage/bucket-registry.ts`, `resolve-bucket.ts` |
| Admin config (S0067) | `cloud/jord/src/storage/bucket-admin.ts`, `bucket-admin-routes.ts` |
| Routes | `cloud/jord/src/blobs/routes.ts` (per-bucket `resolveBucket`) · `/admin/buckets` via `createBucketAdminRoutes` |
| GC job | `blobs_gc` in `cloud/jord/src/jobs/kinds.ts` (resolves storage per pending bucket) |
| Studio | **Storage** → `/storage` (existing BFF; no secrets in JSON) — wizard/browser → [[../../../plan/Jord/phase-03/S0068-storage-studio-ui\|S0068]] |
| Tests | `storage/bucket-registry.test.ts` · `storage/bucket-admin.test.ts` · `blobs/delete-failure.test.ts` · live S3 `storage/s3-live.test.ts` gated on `JORD_TEST_S3_ENDPOINT` |

MinIO needs path-style addressing: set `JORD_S3_FORCE_PATH_STYLE=1` with `JORD_STORAGE_BACKEND=s3` (or `force_path_style` / `provider=minio` on the row). Admin create defaults path-style for minio/`s3-compatible`.

## Example

Editor `POST /blobs/lab/objects/note.txt/sign` `{ "intent":"upload", "content_type":"text/plain" }` → PUT body to `url` → `POST …/finalize`. Denied `jord_blobs` policies return **403** at sign even if meta already exists.

Admin `POST /blobs/buckets` `{ "name":"lab" }` creates the disk/prefix **and** a `jord_buckets` row with the env default provider when none existed.

Admin `POST /admin/buckets/:name/test` with provider + keys probes without saving; `POST /admin/buckets` probes then seals credentials. `POST …/rotate` rejects the previous sealed envelopes in-process immediately.

## Not in Jord yet

Studio bucket wizard ([[../../../plan/Jord/phase-03/S0068-storage-studio-ui\|S0068]]) · automatic cutover without an operator flag · multipart/resumable ([[../../../plan/Jord/phase-03/S0081-multipart-uploads\|S0081]])
