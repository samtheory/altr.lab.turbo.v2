---
title: "Jord — writes"
description: "Write queue (serial libSQL; configurable Postgres width), OCC on records, user-table PK writes"
created: 2026-10-24
updated: 2026-11-01
tags:
  - tech-space
  - jord
  - writes
  - occ
  - s0036
  - s0038
  - idempotency
---

# Jord — writes

> Who: anyone mutating rows. Schema DDL: [[../schema/README]]. Auth gates: [[../auth/README]].

## Why

SQLite has one writer. Jord multiplexes hot mutations in `@altr/jord-server` so Studio, jobs, and function steps do not open the file from many processes. Postgres may widen the in-process queue. `records` also needs optimistic concurrency so a stale editor cannot overwrite a newer row.

## What

**Queue.** `cloud/jord/src/queue.ts` is an in-process worker pool. Inserts, updates, deletes, DDL, blob meta, and embedding upserts go through `enqueueWrite`.

| Dialect | Width | Notes |
|-----------|-------|-------|
| **libSQL** (`file:` / `libsql://`) | always **1** | Serial drain. If `JORD_PG_WRITE_CONCURRENCY` is set to anything other than `1`, the server warns once and ignores it. |
| **Postgres** | `JORD_PG_WRITE_CONCURRENCY` | Integer **1…8**, default **1**. Out-of-range / non-integer → refuse boot. |

Accessors: `pending()` (waiting + in-flight) and `inFlight()` (running). `/health/ready` validates both are finite and `inFlight ≤ pending` ([[../overview/README#health-probes-s0034]]). Card: [[../../../plan/Jord/phase-03/done/S0038-pg-write-concurrency|S0038]].

**`records` (OCC scratchpad).** Columns include `id`, `bucket`, `body` (TEXT), `metadata`, `version`, `created_at`, `updated_at`. Insert sets `version = 1` and both timestamps to the same `Date.now()` ms. Update runs `version = version + 1` only `WHERE id = ? AND version = ?`. No match → HTTP **409**. Delete is a queued hard delete.

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/records` | queued insert |
| `GET` | `/records?bucket=` | newest first |
| `GET` | `/records/:id` | 404 if missing |
| `PATCH` | `/records/:id` | body includes `version` |
| `DELETE` | `/records/:id` | write role |

**User tables** (not `records`). Identity is exactly one primary key. No required `version` column.

| Method | Path | Role |
|--------|------|------|
| `POST` | `/schema/tables/:name/rows` | editor+ `{ values }` |
| `PATCH` | `/schema/tables/:name/rows/:pk` | editor+ `{ values, old? }` |
| `DELETE` | `/schema/tables/:name/rows/:pk` | editor+ |

Duplicate primary key → **409** `pk_exists`. Missing row → **404**. Optional `old` is a compare-and-swap snapshot of previous column values (null-safe); mismatch → **409** `conflict` (Studio inline edit / S0058). Reserved names (`records`, `jord_*`, `sqlite_*`, `pg_*`) → **400**.

## How

| Piece | Path |
|-------|------|
| OCC SQL | adapter update on `records` |
| User-table planner | `elements/jord/src/schema/row-write.ts` |
| HTTP | `cloud/jord/src/app.ts` |
| Queue | `createWriteQueue({ concurrency })` · `resolveWriteConcurrency(env, dialect)` |
| Queue drain | `enqueueWrite.drain()` on shutdown, before pools close |
| Idempotency | optional `Idempotency-Key` on record, schema-row, and blob-object writes. Same key + principal + body replays the stored response. Different body → **409** `idempotency_conflict`. TTL default 24h. **Postgres** stores rows in `jord_idempotency` (shared across instances, S0036); **libSQL** keeps the in-memory map — see [[../apis/README#shared-rate-limit--idempotency-s0036]] |
| Rate-limit / idempotency stores | `cloud/jord/src/http/rate-limit-store.ts` + `cloud/jord/src/idempotency/pg-store.ts` + `cloud/jord/src/idempotency/store.ts` + `cloud/jord/src/idempotency/sweep.ts` (job `shared_state_sweep`) |
| Migration | `elements/jord/migrations/{postgres,libsql}/0007_rate_limit_idempotency.sql` |

Studio edits `records` at `/records` (column fields, optional JSON check on `body`). Other tables use `/tables/[name]`. `/tables/records` redirects to the OCC editor.

## Example

```http
PATCH /records/8f2… HTTP/1.1
Authorization: Bearer …
{"version":1,"body":"{\"note\":\"hello\"}"}
```

A second PATCH that still sends `"version": 1` returns **409**.

## Not in Jord yet

Full multi-column OCC without an explicit `old` snapshot. A generated API catalog per user table. Direct writes to `data/jord.db` from the browser.
