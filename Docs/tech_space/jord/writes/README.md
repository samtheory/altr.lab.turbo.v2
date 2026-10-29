---
title: "Jord — writes"
description: "One write queue, OCC on records, and primary-key writes on user tables"
created: 2026-10-24
updated: 2026-10-29
tags:
  - tech-space
  - jord
  - writes
  - occ
  - s0036
  - idempotency
---

# Jord — writes

> Who: anyone mutating rows. Schema DDL: [[../schema/README]]. Auth gates: [[../auth/README]].

## Why

SQLite has one writer. Jord serializes hot mutations in `@altr/jord-server` so Studio, jobs, and function steps do not open the file from many processes. `records` also needs optimistic concurrency so a stale editor cannot overwrite a newer row.

## What

**Queue.** `cloud/jord/src/queue.ts` is an in-process promise chain. Inserts, updates, deletes, DDL, blob meta, and embedding upserts go through `enqueueWrite`.

**`records` (OCC scratchpad).** Columns include `id`, `bucket`, `body` (TEXT), `metadata`, `version`, `created_at`, `updated_at`. Insert sets `version = 1` and both timestamps to the same `Date.now()` ms. Update runs `version = version + 1` only `WHERE id = ? AND version = ?`. No match → HTTP **409**. Delete is a queued hard delete.

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/records` | queued insert |
| `GET` | `/records?bucket=` | newest first |
| `GET` | `/records/:id` | 404 if missing |
| `PATCH` | `/records/:id` | body includes `version` |
| `DELETE` | `/records/:id` | write role |

**User tables** (not `records`). Identity is exactly one primary key. No `version` column.

| Method | Path | Role |
|--------|------|------|
| `POST` | `/schema/tables/:name/rows` | editor+ `{ values }` |
| `PATCH` | `/schema/tables/:name/rows/:pk` | editor+ |
| `DELETE` | `/schema/tables/:name/rows/:pk` | editor+ |

Duplicate primary key → **409** `pk_exists`. Missing row → **404**. Reserved names (`records`, `jord_*`, `sqlite_*`, `pg_*`) → **400**.

## How

| Piece | Path |
|-------|------|
| OCC SQL | adapter update on `records` |
| User-table planner | `elements/jord/src/schema/row-write.ts` |
| HTTP | `cloud/jord/src/app.ts` |
| Queue drain | `createWriteQueue().drain()` on shutdown, before pools close |
| Idempotency | optional `Idempotency-Key` on record, schema-row, and blob-object writes. Same key + principal + body replays the stored response. Different body → **409** `idempotency_conflict`. TTL default 24h. **Postgres** stores rows in `jord_idempotency` (shared across instances, S0036); **libSQL** keeps the in-memory map — see [[../apis/README#shared-rate-limit--idempotency-s0036]] |

Studio edits `records` at `/records` (column fields, optional JSON check on `body`). Other tables use `/tables/[name]`. `/tables/records` redirects to the OCC editor.

## Example

```http
PATCH /records/8f2… HTTP/1.1
Authorization: Bearer …
{"version":1,"body":"{\"note\":\"hello\"}"}
```

A second PATCH that still sends `"version": 1` returns **409**.

## Not in Jord yet

OCC on arbitrary user tables. A generated API catalog per user table. Direct writes to `data/jord.db` from the browser.
