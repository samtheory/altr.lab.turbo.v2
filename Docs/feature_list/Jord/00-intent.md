---
title: "Jord — libSQL file, first slice"
description: "Jord-S0001 / Slice 0: data/jord.db with WAL pragmas, records scratchpad, snapshot script. No Studio, no Postgres."
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - jord
  - libsql
  - database
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

`@altr/base` stays for shared utils. It must not stay a second database client after this slice.

## What (Slice 0)

| Piece | Decision |
|-------|----------|
| Infra | One file: `data/jord.db`. Gitignored. Created on first boot |
| Library | `elements/jord` (`@altr/jord`) — Drizzle schema + libSQL client |
| Driver | `@libsql/client` through Drizzle’s libSQL driver |
| URL | `DATABASE_URL`, default `file:./data/jord.db`. Only `file:` accepted |
| Schema | One table, `records` (scratchpad — see below) |
| Pragmas | WAL / busy_timeout / synchronous on every open |
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

Rationale: non-blocking reads during concurrent writes between Artemis (logging / ticks) and the Hono server; avoid `database is locked`. No extra processes.

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
| `created_at` | integer, not null | Unix ms |
| `updated_at` | integer, not null | Unix ms; set on insert and update |

**Required index:** `(bucket, created_at)` composite — no full-table scans across buckets.

### Server routes

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/health` | `{ ok: true }`, dialect `libsql` |
| `POST` | `/records` | Body `{ bucket, body, metadata? }` → one row |
| `GET` | `/records?bucket=` | Rows for that bucket, newest first (uses the composite index) |
| `GET` | `/records/:id` | One row or 404 |

### Packages this slice may touch

- `elements/jord` — new (client, pragmas, schema, snapshot helper)
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

- [ ] First boot creates `data/jord.db` and `records` with the columns and `(bucket, created_at)` index above
- [ ] Every open applies WAL, `busy_timeout = 5000`, `synchronous = NORMAL`
- [ ] `data/*.db` is gitignored
- [ ] `pnpm db:snapshot` (or documented equivalent) can copy the live file via SQLite online backup
- [ ] Insert and read round-trip through `@altr/jord-server` for one bucket
- [ ] A non-`file:` `DATABASE_URL` fails with an error that names the Slice 0 limit
- [ ] `apps/` gains no new package
- [ ] `cloud/` gains only `jord` among new API packages (PocketBase may remain unused)
- [ ] No second competing client left in `@altr/base/db`

## Open question

None for this slice. Dialect port and Studio are [[02-architecture]] and [[03-jord-studio]].
