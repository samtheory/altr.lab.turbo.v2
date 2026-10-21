---
title: "Jord — libSQL file, first slice"
description: "Slice 0: LibSqlAdapter, WAL checkpoints, records OCC version, 64-bit timestamps, mkdir data/, snapshot."
created: 2026-10-18
updated: 2026-10-21
tags:
  - feature
  - jord
  - libsql
  - database
  - Jord-S0001
---

# Jord — libSQL file, first slice

> Contract for [[../../plan/Jord/Jord-S0001/README|Jord-S0001]] (Slice 0). Product: **Jord**. Admin app: **Jord Studio** (not this slice). Decisions: [[../../idea/Jord/2026-10-18-sharpen]]. Layout: [[02-architecture]]. Studio: [[03-jord-studio]].

Later: [[01-later]] · Stack: [[../../Altr.lab/stack]]

## Why

Every product in the catalog needs one store. Artemis will keep **agent scratchpad** rows here (not typed trading entities). libSQL as a **file in this repo** is the right first fit: no hosted account, portable with a copy of `data/jord.db`, WAL so the bot and the API can share the file, Turso later by URL, Drizzle path to Postgres for table CRUD when plugins demand it ([[02-architecture]]).

## Name

| Use | Name |
|-----|------|
| Product | Jord |
| Studio (later) | Jord Studio |
| Library | `@altr/jord` in `elements/jord` |
| Server | `@altr/jord-server` in `cloud/jord` |
| Docs folders | `idea/Jord`, `feature_list/Jord`, `plan/Jord` |

`@altr/base` stays for shared **framework utils**. Jord (and other packages) **may** depend on it. Base must **not** depend on Jord or any other element, and must not stay a second database client after this slice. See [[../00-elements-dependency-rules]].

## What (Slice 0)

| Piece | Decision |
|-------|----------|
| Infra | One file: `data/jord.db`. Gitignored. Created on first boot |
| Library | `elements/jord` (`@altr/jord`) — `JordDriverPort`, `LibSqlAdapter`, Drizzle schema |
| Driver | `LibSqlAdapter` only. `PostgresAdapter` is a reserved uninstantiated seam |
| URL | `DATABASE_URL`, default `file:./data/jord.db`. Only `file:` accepted |
| Init | Recursively create `data/` before open (`mkdir -p`) |
| Schema | One table, `records` (scratchpad — see below) |
| Pragmas | WAL / busy_timeout / synchronous on every open |
| Writes | Hot paths batch through `@altr/jord-server` (see [[02-architecture]]) |
| Snapshot | `pnpm db:snapshot` (SQLite online backup) before high-write work |
| Cloud servers | **One:** `cloud/jord` (`@altr/jord-server`) |
| Apps | **Zero.** No Jord Studio yet |
| PocketBase | Unused for this data |

### Storage engine config

On every connection open:

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

Rationale: WAL = concurrent non-blocking reads; single writer + `busy_timeout` for light contention. High-frequency writers still batch through `@altr/jord-server`. No extra processes, no Redis.

### WAL hygiene (`@altr/jord-server`)

WAL mode writes a sidecar `jord.db-wal`. The server process owns checkpointing so that file cannot grow without bound:

| When | Action |
|------|--------|
| Periodic background maintenance | `PRAGMA wal_checkpoint(TRUNCATE);` |
| Graceful shutdown (`SIGINT`, `SIGTERM`) | The same truncate checkpoint, then exit |

Checkpointing stays inside the one server process. Slice 0 does not add a second maintenance daemon.

### `records` — role

Generic **JSON document / key-value / agent scratchpad**. Buckets namespace apps (`lab`, later `artemis` for agent notes).

**Boundary:** Artemis trading domain tables (`orders`, `positions`, `trades`, …) must **not** be stuffed into `records.body`. They get typed Drizzle relations in later slices. Slice 0 does not create them. sqlite-vec is not installed; the column set is only ready for a later vector attachment.

### `records` — columns

| Column | Type | Notes |
|--------|------|--------|
| `id` | text, primary key | cuid2 or uuid on insert |
| `bucket` | text, not null | App / agent namespace |
| `body` | text, not null | JSON document |
| `metadata` | text, optional | JSON tags; null allowed |
| `created_at` | integer, not null | Unix **milliseconds**, 64-bit safe (see below) |
| `updated_at` | integer, not null | Unix ms, 64-bit safe; set on insert and update |
| `version` | integer, not null | Optimistic concurrency. Default `1` on insert |

**Required index:** `(bucket, created_at)` composite — no full-table scans across buckets.

**Timestamps in Drizzle:** map `created_at` and `updated_at` as 64-bit-safe integers — `integer({ mode: 'number' })` or an equivalent that stores a full SQLite/Postgres 64-bit integer. Do not use a 32-bit signed integer mode (that overflows millisecond Unix time). JavaScript `number` is safe for millisecond timestamps well past any practical horizon (`2^53`).

**Optimistic concurrency:** every mutation increments `version` by 1 and updates only when the caller’s version matches:

```sql
UPDATE records
SET …, version = version + 1, updated_at = ?
WHERE id = ? AND version = ?;
```

Zero rows updated → **409 Conflict**. Inserts start at `version = 1`. Reads return `version` so the next write can send it back.

### Server routes

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/health` | `{ ok: true }`, dialect `libsql` |
| `POST` | `/records` | Body `{ bucket, body, metadata? }` → one row, `version` 1 |
| `GET` | `/records?bucket=` | Rows for that bucket, newest first (uses the composite index), including `version` |
| `GET` | `/records/:id` | One row or 404, including `version` |
| `PATCH` | `/records/:id` | Body includes `version` plus fields to change. Match `id` and `version`; increment `version`. **409** if the version does not match |

### Packages this slice may touch

- `elements/jord` — new (`JordDriverPort`, `LibSqlAdapter`, pragmas, schema, mkdir, snapshot helper)
- `elements/base` — stop being the live Turso client
- `cloud/jord` — new
- Root `.gitignore` — `data/*.db`
- Root script — `pnpm db:snapshot`
- [[../../Altr.lab/structure]] · [[../../Altr.lab/stack]]

## Out of scope

- Jord Studio and any new app under `apps/`
- Postgres, PGlite, Mongo, Redis, cache, websockets
- Auth, roles, policies, triggers, jobs, logs UI
- sqlite-vec, embedding columns, bot process
- Typed trading tables (`orders`, `positions`, `trades`)
- Committing `data/jord.db` to git
- Extra cloud servers

## Acceptance

Verified 2026-10-21 against code + tests ([[../../tech_space/jord/00-s0001-slice0]]):

- [x] `createJordClient` recursively creates `data/` then creates `data/jord.db` and `records` with the columns and `(bucket, created_at)` index above
- [x] Client exposes `JordDriverPort`; only `LibSqlAdapter` is installed; `PostgresAdapter` is not a runtime dependency
- [x] Every open applies WAL, `busy_timeout = 5000`, `synchronous = NORMAL`
- [x] `@altr/jord-server` runs `PRAGMA wal_checkpoint(TRUNCATE)` on an interval and on `SIGINT` / `SIGTERM`
- [x] `created_at` and `updated_at` are Drizzle 64-bit-safe integers (`integer({ mode: 'number' })` or equivalent), not 32-bit
- [x] `records.version` is integer, not null, default 1; a `PATCH` with a stale `version` returns 409 and does not write; a matching `PATCH` increments `version`
- [x] `data/*.db` is gitignored
- [x] `pnpm db:snapshot` (or documented equivalent) can copy the live file via SQLite online backup
- [x] Insert and read round-trip through `@altr/jord-server` for one bucket
- [x] A non-`file:` `DATABASE_URL` fails with an error that names the Slice 0 limit
- [x] `apps/` gains no new package
- [x] `cloud/` gains only `jord` among new API packages (PocketBase may remain unused)
- [x] No second competing client left in `@altr/base/db`

## Open question

None for this slice. Dialect port and Studio are [[02-architecture]] and [[03-jord-studio]].
