---
title: "Phase 3 — blob HTTP routes on jord-server"
description: "Wire /blobs* routes, write queue, streaming download, BFF notes"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0013
  - blobs
  - server
---

# Phase 3 — blob HTTP routes on jord-server

> Who: **sindri** (routes / queue) · **heimdall** (limits / auth hooks).

Sprint index: [[README]] · Contract: [[01-contract]] · Engine: [[02-engine-store]]

## Status

**done** (2026-10-24)

## Goal

Expose the contract routes on `@altr/jord-server` with the same auth middleware family as records/schema.

## Work

| Piece | Notes |
|-------|--------|
| Routes | Implement table in [[01-contract]] |
| Upload | Prefer multipart field `file` + optional `content_type`; also accept raw body with `Content-Type` |
| Write path | `enqueueWrite` for metadata upsert/delete; write/delete bytes in the same critical section so meta and disk stay aligned |
| Download | Stream file; set `Content-Type`, `Content-Length`, `ETag` |
| Errors | 400 / 404 / 409 / 413 / 401 / 403 — consistent JSON error shape with existing server |
| Catalog | Optional: add blob resources to generated API catalog (nice-to-have; not required for DoD) |
| Health | No change required; do not put blob root in `/health` payload |

### Studio BFF (`apps/jord-studio`)

Proxy `/api/blobs/*` → jord-server `/blobs/*` (same pattern as records/schema). Do not buffer entire large downloads in the BFF if avoidable — pass through stream when Next allows.

## Done when

- [x] Curl (or vitest) can create bucket, PUT object, GET list, GET bytes, DELETE
- [x] Oversize upload returns 413
- [x] Traversal keys return 400
- [x] Mutations go through the write queue
