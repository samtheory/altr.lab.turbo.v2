---
title: "Jord-S0001 — libSQL file and one server"
description: "Slice 0 plan: data/jord.db, WAL pragmas, records scratchpad, snapshot. Jord Studio out of scope."
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Jord-S0001 — libSQL file and one server

> Checkbox overlay for [[../../../feature_list/Jord/00-intent]]. Status: opened 2026-10-18, not started. Decisions: [[../../../idea/Jord/2026-10-18-sharpen]]. Layout: [[../../../feature_list/Jord/02-architecture]].

## In scope

- [ ] `elements/jord` (`@altr/jord`) opens `data/jord.db` and creates it on first boot
- [ ] On every open: `PRAGMA journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL`
- [ ] `data/*.db` is gitignored
- [ ] Drizzle `records`: `id`, `bucket`, `body`, `metadata`, `created_at`, `updated_at` + index `(bucket, created_at)`
- [ ] `DATABASE_URL` defaults to `file:./data/jord.db`; other schemes fail clearly
- [ ] `pnpm db:snapshot` (SQLite online backup) exists and is documented
- [ ] `cloud/jord` (`@altr/jord-server`): `GET /health`, `POST /records`, `GET /records?bucket=`, `GET /records/:id`
- [ ] One insert/read round-trip through that server
- [ ] `@altr/base/db` is not a second live client

## Out of scope

- [ ] Jord Studio (`apps/jord-studio`)
- [ ] Auth, jobs UI, logs UI, schema visualizer, generated/custom APIs
- [ ] Postgres, Redis, Mongo, cache, websockets, sqlite-vec, bot process
- [ ] Typed trading tables (`orders`, `positions`, `trades`)

## Done when

[[../../../feature_list/Jord/00-intent]] acceptance is true, and a `tech_space` note records the wiring.
