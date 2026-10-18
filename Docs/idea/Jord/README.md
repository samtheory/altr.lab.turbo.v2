---
title: "Jord — idea track (current)"
description: "Current Jord idea brief for agents. Slice 0 is one libSQL file, WAL pragmas, records scratchpad, and one Hono server. Build contract is feature_list."
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - jord
  - baas
  - readme
---

# Jord

> **Read this file.** It is the current idea brief. Decision record (same facts, longer rationale): [[2026-10-18-sharpen]]. What to build: [[../../feature_list/Jord/00-intent]]. Do not treat the old candidate ladder as current — it has been removed from this note.

**Status:** name locked. Intent written. Plan [[../../plan/Jord/Jord-S0001/README]] opened, **not started**. No Jord packages in the repo yet.

| | |
|--|--|
| Product | **Jord** |
| Later admin app | **Jord Studio** (`apps/jord-studio`) — not Slice 0 |
| Slice 0 | One file, one library, one server. No Postgres, Redis, Mongo, Studio, or extra process |

Catalog: [[../2026-10-18-product-catalog]] · Map: [[../../brain/00-Docs-Brain]] · Stack: [[../../Altr.lab/stack]]

## Where code will live

| Thing | Path | Package |
|-------|------|---------|
| Database file | `data/jord.db` (gitignored) | — |
| Client + schema | `elements/jord/` | `@altr/jord` |
| API | `cloud/jord/` | `@altr/jord-server` |
| Studio (later) | `apps/jord-studio/` | `@altr/jord-studio` |

`@altr/base` stays shared utils. After Slice 0 it must not be a second database client. PocketBase is not Jord.

Modular packages now, one local product. Split deployables later without renaming Jord. Detail: [[../../feature_list/Jord/02-architecture]].

## Slice 0 (the only build allowed first)

- File: `file:./data/jord.db`. Any other `DATABASE_URL` scheme fails.
- On every connection open: `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;` so Artemis ticks and the Hono server can share the file without `database is locked`.
- Snapshot before high-write work: `pnpm db:snapshot` (SQLite online backup) via `@altr/jord`. The `.db` file is untracked.
- Drizzle + libSQL driver only. sqlite-vec is not installed.
- Server routes: `GET /health`, `POST /records`, `GET /records?bucket=`, `GET /records/:id`.

### `records`

Generic JSON document / key-value / **agent scratchpad**. Not the trading ledger.

| Column | Type |
|--------|------|
| `id` | text pk (cuid2 or uuid) |
| `bucket` | text, not null |
| `body` | text, not null (JSON) |
| `metadata` | text, optional (JSON tags) |
| `created_at` | integer, not null (unix ms) |
| `updated_at` | integer, not null (unix ms) |

**Required index:** `(bucket, created_at)`.

**Boundary:** `orders`, `positions`, and `trades` must not be stored inside `records.body`. Those get typed Drizzle tables in a later slice.

## Later (not Slice 0)

Order: [[../../feature_list/Jord/01-later]]. Studio surfaces (tables, schema visualizer, live save, jobs, logs, auth, generated and custom APIs, functions, triggers, policies, roles): [[../../feature_list/Jord/03-jord-studio]].

Postgres is a second Drizzle driver later. Table CRUD can move; plugins, triggers, and policies need a dialect seam ([[../../feature_list/Jord/02-architecture]]).

## Repo today

`elements/base` db/auth/query are stubs. No `elements/jord`, no `cloud/jord`, no `data/jord.db`. Sample API and dashboard apps were removed ([[../../tech_space/03-sample-apps-removed]]). `apps/apolyx` and `cloud/pocketbase` remain.

## Links

- Decisions: [[2026-10-18-sharpen]]
- Slice 0 contract: [[../../feature_list/Jord/00-intent]]
- Plan (not started): [[../../plan/Jord/Jord-S0001/README]]
