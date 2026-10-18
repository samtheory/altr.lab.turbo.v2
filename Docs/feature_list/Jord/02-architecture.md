---
title: "Jord — architecture, dialects, and repo layout"
description: "Why libSQL first, how Drizzle ports to Postgres, modular packages that can ship as one product or split later, and where the db file and Jord code live"
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - jord
  - architecture
  - libsql
  - drizzle
---

# Jord — architecture, dialects, and repo layout

> Open this for placement and dialect questions. First slice contract: [[00-intent]]. Studio surface: [[03-jord-studio]]. Later order: [[01-later]].

## Is libSQL the right first fit?

Yes, for the needs locked so far.

| Need | How libSQL answers it |
|------|------------------------|
| Run inside this repo with no hosted account | A file at `data/jord.db` |
| Carry the lab between machines | Copy that file (gitignored). Schema lives in Drizzle, not in git as a binary |
| Artemis bot rows and later search | Same file. `sqlite-vec` attaches when retrieval is real |
| Stay light | One process can open the file. No Kong / PostgREST stack |
| Grow without a rewrite of table CRUD | Same Drizzle schema module; swap the driver and `DATABASE_URL` |

Postgres stays a second dialect when a product needs Postgres-only plugins or SLAs. It is not the first boot target.

## Drizzle and a later Postgres port

**Tables and ordinary queries:** yes, with discipline. One schema module in TypeScript. First slice wires the libSQL driver only. A later slice adds the Postgres driver and accepts `postgres://` (or PGlite for local Postgres). App code that goes through Drizzle for insert/select/update/delete should move with a connection change, not a rewrite of every route.

**What does not port automatically**

| Concern | On libSQL / SQLite | On Postgres | Rule |
|---------|--------------------|-------------|------|
| Column types that are SQLite-only or Postgres-only | Prefer `text`, `integer`, `real`, and JSON-as-text until a dialect adapter exists | Prefer the same boring types first | Keep the first tables boring ([[00-intent]] `records.body` is text for this reason) |
| Extensions / plugins | `sqlite-vec`, SQLite extensions | `pgvector`, Postgres extensions | Own a small adapter per dialect. Do not pretend Drizzle ships the plugin |
| Triggers and functions | SQLite trigger SQL | PL/pgSQL / Postgres functions | Store intent in Jord metadata; emit dialect SQL from a generator, or keep them dialect-scoped |
| Row policies / roles | Emulate in the API until a real model exists | Postgres RLS is native | Studio “policies” are a Jord feature. On Postgres they may compile to RLS. On libSQL they stay in the API layer |
| Cron / jobs | Process schedules in the Jord server | Same, or Postgres `pg_cron` later | Jobs are a Jord module, not a database vendor feature, until a plan says otherwise |

So: **CRUD and schema shape move with Drizzle. Plugins, triggers, and policies need an explicit dialect seam.** That seam is why the packages below stay modular.

## Modular now, one product later

Build Jord as separate packages in this monorepo. You can run them as one local stack (file + one server + Studio). You can also split a package into its own deployable later without renaming the product.

```
one product (Jord)
  ├── @altr/jord          schema, client, dialect seam
  ├── @altr/jord-server   Hono API, jobs runner, generated + custom routes
  └── @altr/jord-studio   dashboard UI (Apolyx)
```

S0001 only creates the client wiring and the server. Studio is a later package. Artemis and other apps import `@altr/jord`; they do not open the file themselves.

## Where things live in the repo

| Thing | Path | Package | Notes |
|-------|------|---------|--------|
| Database **file** | `data/jord.db` | — | Gitignored. Created on first boot. Not source code |
| Schema, client, dialect seam | `elements/jord/` | `@altr/jord` | Drizzle schema, `createJordClient`, URL parsing. First home of Jord as a library |
| Shared leftovers | `elements/base/` | `@altr/base` | Utils, env helpers, errors. `db` stub is replaced or re-exported from `@altr/jord` when S0001 lands — do not leave two competing clients |
| API engine | `cloud/jord/` | `@altr/jord-server` | Hono on Bun. Generated CRUD, custom routes, later jobs and logs |
| Jord Studio | `apps/jord-studio/` | `@altr/jord-studio` | Next.js + Apolyx. Not in S0001 |
| Docs for this track | `Docs/idea/Jord`, `Docs/feature_list/Jord`, `Docs/plan/Jord` | — | Already named |

### S0001 placement (narrow)

| Piece | Path |
|-------|------|
| File | `data/jord.db` |
| Library | `elements/jord` (`@altr/jord`) |
| Server | `cloud/jord` (`@altr/jord-server`) |
| Studio | none |

Earlier drafts named `data/altr.db` and `cloud/hono-server`. The locked names are **`data/jord.db`** and **`cloud/jord`**. PocketBase stays in `cloud/pocketbase` and is not Jord.

## Env

| Variable | First slice | Later |
|----------|-------------|--------|
| `DATABASE_URL` | Required shape `file:…`, default `file:./data/jord.db` | Also `libsql://…` then `postgres://…` |
| Auth tokens | unused | Turso token, Postgres password, Studio session secrets |

## Links

- First slice: [[00-intent]]
- Studio vision: [[03-jord-studio]]
- Slice order: [[01-later]]
- Stack: [[../../Altr.lab/stack]]
- Structure: [[../../Altr.lab/structure]]
