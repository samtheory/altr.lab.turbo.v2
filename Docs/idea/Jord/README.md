---
title: "Jord — idea track (current)"
description: "Current Jord idea brief. Slice 0 plan is ready to implement. Build contract in feature_list."
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - jord
  - baas
  - readme
---

# Jord

> **Read this file.** Current idea brief. Decision record: [[2026-10-18-sharpen]]. Build contract: [[../../feature_list/Jord/00-intent]]. Architecture (ports, concurrency): [[../../feature_list/Jord/02-architecture]].

**Status:** name locked. Intent written. Plan [[../../plan/Jord/Jord-S0001/README]] is **ready to implement** (start at card 1). No Jord packages in the repo yet.

| | |
|--|--|
| Product | **Jord** |
| Later admin app | **Jord Studio** — not Slice 0 |
| Slice 0 | `file:` + `LibSqlAdapter` + one server. `PostgresAdapter` is a seam only. No Redis, Mongo, Studio, sqlite-vec |

Catalog: [[../2026-10-18-product-catalog]] · Map: [[../../brain/00-Docs-Brain]] · Stack: [[../../Altr.lab/stack]]

## Where code will live

| Thing | Path | Package |
|-------|------|---------|
| Database file | `data/jord.db` (gitignored) | — |
| Port + adapters + schema | `elements/jord/` | `@altr/jord` |
| API (write batching) | `cloud/jord/` | `@altr/jord-server` |
| Studio (later) | `apps/jord-studio/` | `@altr/jord-studio` |

`@altr/base` = shared utils, not a second DB client. PocketBase is not Jord.

## Slice 0 (only build allowed first)

- Hexagonal: app code uses `JordDriverPort`. Only `LibSqlAdapter` is installed. `PostgresAdapter` reserved, not instantiated.
- `DATABASE_URL` = `file:./data/jord.db` only. Other schemes fail.
- `createJordClient` recursively creates `data/` then opens the file.
- Pragmas every open: `WAL`, `busy_timeout = 5000`, `synchronous = NORMAL`.
- Server checkpoints WAL with `PRAGMA wal_checkpoint(TRUNCATE)` on an interval and on `SIGINT` / `SIGTERM`.
- Hot writes (Artemis ticks, bulk logs) go through `@altr/jord-server`, not many processes on the raw file.
- Snapshot: `pnpm db:snapshot`. sqlite-vec not installed.
- Routes: `GET /health`, `POST /records`, `GET /records?bucket=`, `GET /records/:id`, `PATCH /records/:id` (409 on stale `version`).

### `records`

Agent / JSON scratchpad. Columns: `id`, `bucket`, `body`, `metadata?`, `created_at`, `updated_at`, `version` (integer, default 1). Index `(bucket, created_at)`. Updates match `version` and return **409** on conflict. `created_at` / `updated_at` are 64-bit-safe Drizzle integers (`integer({ mode: 'number' })` or equivalent). Typed `orders` / `positions` / `trades` never live in `body`.

## Later (not Slice 0)

[[../../feature_list/Jord/01-later]] — hosted libSQL, `PostgresAdapter`, vectors, **realtime CDC**, **local blob storage**, **in-process vector pipelines**. Studio: [[../../feature_list/Jord/03-jord-studio]].

## Repo today

`elements/base` stubs only. No `elements/jord`, `cloud/jord`, or `data/jord.db`. Sample apps removed ([[../../tech_space/03-sample-apps-removed]]).

## Links

- [[2026-10-18-sharpen]] · [[../../feature_list/Jord/00-intent]] · [[../../plan/Jord/Jord-S0001/README]]
