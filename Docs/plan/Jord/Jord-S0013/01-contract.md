---
title: "Phase 1 — blob buckets contract"
description: "Bucket/key rules, disk layout, metadata columns, HTTP shape, size limits"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0013
  - blobs
  - contract
---

# Phase 1 — blob buckets contract

> Who: **mimir** (scope) · **heimdall** (abuse / size limits). Engine and Studio implement against this note.

Sprint index: [[README]] · Intent S10: [[../../../feature_list/Jord/03-jord-studio]] · Pillar: [[../../../feature_list/Jord/01-later]]

## Status

**done** (2026-10-24)

## Goal

Lock what a bucket/object is, where bytes live, and the HTTP surface — without promising S3 compatibility or remote backends.

## Model (v1)

| Piece | Choice |
|-------|--------|
| Bucket | Logical namespace; name = SQL-safe ident rules (reuse `isValidSqlIdent` or a dedicated blob-name regex: `[a-z0-9][a-z0-9_-]{0,62}`) |
| Key | Relative path inside bucket; reject `..`, absolute paths, empty segments, leading `/` |
| Disk root | `data/blobs/` (sibling of `jord.db`; recursive mkdir on first use) |
| Object path | `data/blobs/<bucket>/<key>` — create parent dirs as needed |
| Metadata | Row in `jord_blobs` per object |

### `jord_blobs` columns

| Column | Type | Notes |
|--------|------|--------|
| `id` | text PK | cuid2 / uuid |
| `bucket` | text not null | |
| `key` | text not null | Relative object key |
| `content_type` | text not null | From upload; default `application/octet-stream` |
| `size` | integer not null | Bytes |
| `etag` | text not null | Content hash (sha256 hex) for integrity / cache |
| `created_at` | integer not null | Unix ms |
| `updated_at` | integer not null | Unix ms |

**Required unique index:** `(bucket, key)`.  
**List index:** `(bucket, created_at)` or `(bucket, key)`.

Reserved bucket names: empty, `..`, names matching system prefixes if needed (`jord_system` — document if used). Do **not** collide with SQL table names; blobs are a separate namespace.

## HTTP (S3-shaped, not S3)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/blobs/buckets` | List distinct buckets (from metadata +/or disk) |
| `POST` | `/blobs/buckets` | Body `{ name }` — ensure bucket dir exists (idempotent 200 or 409) |
| `GET` | `/blobs/:bucket` | List objects `{ id, key, content_type, size, etag, updated_at }[]` |
| `PUT` | `/blobs/:bucket/*key` | Multipart or raw body upload; upsert by `(bucket, key)` |
| `GET` | `/blobs/:bucket/*key` | Stream bytes + `Content-Type` / `ETag` |
| `DELETE` | `/blobs/:bucket/*key` | Remove file + metadata row |

Prefer path-param `key` with URL-encoding over query `?key=` for nested keys.

### Limits (heimdall)

| Limit | v1 default |
|-------|------------|
| Max object size | 10 MiB (env override later) |
| Max key length | 512 chars |
| Max buckets | Soft; no hard quota in v1 |
| Content types | Allow-list optional later; v1 accept any non-empty string ≤ 128 chars |

Oversize → **413**. Bad name/key → **400**. Missing → **404**.

## Auth (summary — detail in [[05-role-gates]])

| Action | Role |
|--------|------|
| Create bucket | `admin` |
| Upload / delete object | write (`editor`+) |
| List / download | read (`readonly`+) |

## HTTP note (implementer)

Object routes use `/blobs/:bucket/objects/:key` where `:key` is a single path segment (`encodeURIComponent` of the relative key). Nested keys become `folder%2Ffile.txt`.

## Done when

- [x] This contract is agreed (no open “S3 vs local” debate for v1)
- [x] Columns, paths, routes, and limits above are the implementer checklist
- [x] Out-of-sprint items on [[README]] stay out
