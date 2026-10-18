---
title: "Jord-S0001 — libSQL file and one server"
description: "Slice 0 plan: LibSqlAdapter, WAL, mkdir data/, records scratchpad, snapshot, jord-server. PostgresAdapter seam only."
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Jord-S0001 — libSQL file and one server

> Checkbox overlay for [[../../../feature_list/Jord/00-intent]]. Status: opened 2026-10-18, not started. Architecture: [[../../../feature_list/Jord/02-architecture]]. Decisions: [[../../../idea/Jord/2026-10-18-sharpen]].

## In scope

- [ ] `elements/jord` (`@altr/jord`): `JordDriverPort` + `LibSqlAdapter` (PostgresAdapter not installed)
- [ ] `createJordClient` recursively creates `data/` then opens `data/jord.db`
- [ ] On every open: `PRAGMA journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL`
- [ ] Drizzle `records`: `id`, `bucket`, `body`, `metadata`, `created_at`, `updated_at` (64-bit-safe `integer({ mode: 'number' })` or equivalent), `version` integer default 1, index `(bucket, created_at)`
- [ ] `PATCH /records/:id` with matching `version` increments it; a stale `version` returns 409 and does not write
- [ ] Server runs `PRAGMA wal_checkpoint(TRUNCATE)` on an interval and on `SIGINT` / `SIGTERM`
- [ ] `DATABASE_URL` defaults to `file:./data/jord.db`; other schemes fail clearly
- [ ] `pnpm db:snapshot` (SQLite online backup) exists and is documented
- [ ] `cloud/jord` (`@altr/jord-server`): `GET /health`, `POST /records`, `GET /records?bucket=`, `GET /records/:id`, `PATCH /records/:id` (OCC; hot ingestion still batched here)
- [ ] One insert/read round-trip through that server
- [ ] `@altr/base/db` is not a second live client

## Out of scope

- [ ] Jord Studio (`apps/jord-studio`)
- [ ] `PostgresAdapter` runtime, Redis, Mongo, sqlite-vec, CDC, blob storage
- [ ] Auth, jobs UI, logs UI, schema visualizer, generated/custom APIs
- [ ] Typed trading tables (`orders`, `positions`, `trades`)

## Done when

[[../../../feature_list/Jord/00-intent]] acceptance is true, and a `tech_space` note records the wiring.
