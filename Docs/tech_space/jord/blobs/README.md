---
title: "Jord — blobs"
description: "Local disk object bytes plus jord_blobs metadata and S3-shaped REST"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - blobs
---

# Jord — blobs

> Who: anyone storing files beside the database. Auth: [[../auth/README]].

## Why

Assets should not live inside `records.body`. Metadata stays in SQL so both dialects can list buckets; bytes stay on disk next to the server.

## What

Table `jord_blobs`. Bytes at `data/blobs/<bucket>/<key…>` (`JORD_BLOBS_ROOT` overrides the root). Max object **10 MiB**. Names pass `isValidBlobBucket` / `isValidBlobKey`. Writes of meta+bytes share the write queue.

| Method | Path | Role |
|--------|------|------|
| `GET` | `/blobs/buckets` | authenticated |
| `POST` | `/blobs/buckets` `{ name }` | admin |
| `GET` | `/blobs/:bucket` | authenticated |
| `PUT` | `/blobs/:bucket/objects/:key` | editor+ |
| `GET` | `/blobs/:bucket/objects/:key` | authenticated |
| `DELETE` | `/blobs/:bucket/objects/:key` | editor+ |

`:key` is one path segment (`encodeURIComponent` of the relative key).

## How

| Piece | Path |
|-------|------|
| Metadata port | `elements/jord` blob methods |
| Disk | `createBlobDiskStore` in `@altr/jord-server` |
| Studio | **Storage** → `/storage`, BFF `/api/blobs/*` |

## Example

Admin `POST /blobs/buckets` `{ "name": "lab" }`. Editor `PUT /blobs/lab/objects/note.txt` with the file body. `GET` returns the same bytes. The file is under `data/blobs/lab/note.txt`, not inside `jord.db`.

## Not in Jord yet

Multipart upload, larger limits, SigV4, a remote S3 backend, blob CDC.
