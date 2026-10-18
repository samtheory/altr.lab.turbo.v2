---
title: "Jord — libSQL file, first slice"
description: "Build contract for Jord-S0001: data/jord.db, @altr/jord, @altr/jord-server. Jord Studio is out of scope."
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - jord
  - libsql
  - database
---

# Jord — libSQL file, first slice

> Contract for [[../../plan/Jord/Jord-S0001/README|Jord-S0001]]. Product: **Jord**. Admin app name: **Jord Studio** (not this slice). Layout and dialects: [[02-architecture]]. Studio vision: [[03-jord-studio]].

Idea: [[../../idea/Jord/2026-10-18-sharpen]] · Later: [[01-later]] · Stack: [[../../Altr.lab/stack]]

## Why

Every product in the catalog needs one store. Artemis will keep AI-bot rows here. libSQL as a **file in this repo** is the right first fit: no hosted account, portable with a copy of `data/jord.db`, same driver can take Turso later, and Drizzle keeps a path to Postgres for table CRUD when plugins demand it ([[02-architecture]]).

## Name

| Use | Name |
|-----|------|
| Product | Jord |
| Studio (later) | Jord Studio |
| Library | `@altr/jord` in `elements/jord` |
| Server | `@altr/jord-server` in `cloud/jord` |
| Docs folders | `idea/Jord`, `feature_list/Jord`, `plan/Jord` |

`@altr/base` stays for shared utils. It must not stay a second database client after this slice.

## What (first slice)

| Piece | Decision |
|-------|----------|
| Infra | One file: `data/jord.db` at the repo root. Gitignored. Created on first boot |
| Library | New `elements/jord` (`@altr/jord`) — Drizzle schema + libSQL client |
| Driver | `@libsql/client` through Drizzle’s libSQL driver |
| URL | `DATABASE_URL`, default `file:./data/jord.db`. Only the `file:` scheme is accepted |
| Schema | One table, `records` |
| Cloud servers | **One:** `cloud/jord` (`@altr/jord-server`), Hono on Bun |
| Apps | **Zero.** No `apps/jord-studio` yet. Do not touch `apps/apolyx` |
| PocketBase | Unused for this data |

### `records`

| Column | Type | Notes |
|--------|------|--------|
| `id` | text, primary key | Generated on insert |
| `bucket` | text, required | Later: `artemis` for bot rows. First tests may use `lab` |
| `body` | text, required | JSON text so a Postgres port stays boring |
| `created_at` | integer, required | Unix milliseconds |

### Server routes

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/health` | `{ ok: true }`, dialect `libsql` |
| `POST` | `/records` | Body `{ bucket, body }` → one row |
| `GET` | `/records?bucket=` | Rows for that bucket, newest first |
| `GET` | `/records/:id` | One row or 404 |

### Packages this slice may touch

- `elements/jord` — new
- `elements/base` — stop being the live Turso client; re-export or delete the stub in favor of `@altr/jord`
- `cloud/jord` — new
- Root `.gitignore` — `data/*.db`
- [[../../Altr.lab/structure]] · [[../../Altr.lab/stack]]

## Out of scope

- Jord Studio and any new app under `apps/`
- Postgres, PGlite, Mongo, cache, websockets
- Auth, roles, policies, triggers, jobs, logs UI
- Generated custom function APIs (Studio S4–S6)
- sqlite-vec, bot process
- Committing `data/jord.db` to git

## Acceptance

- [ ] First boot creates `data/jord.db` and the `records` table
- [ ] `data/*.db` is gitignored
- [ ] Insert and read round-trip through `@altr/jord-server` for one bucket
- [ ] A non-`file:` `DATABASE_URL` fails with an error that names the first-slice limit
- [ ] `apps/` gains no new package
- [ ] `cloud/` gains `jord` (PocketBase may remain unused)
- [ ] No second competing client left in `@altr/base/db`

## Open question

None for this slice. Dialect port and Studio are [[02-architecture]] and [[03-jord-studio]].
