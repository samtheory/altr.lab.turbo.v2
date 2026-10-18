---
title: "AltrBase / PolyBase — idea track"
description: "R&D folder for a self-hosted multi-engine BaaS: libSQL first, Postgres later, studio on the dashboard, cache and documents deferred"
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - altr-base
  - polybase
  - baas
  - readme
---

# AltrBase / PolyBase

> Open this to grow the shared backend. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]]. Current stack decision: [[../../Altr.lab/stack]].

**Category:** developer tools and infrastructure.

**Positioning:** a self-hosted, lightweight alternative to Supabase. One API and one query layer. Dev and edge run on SQLite-compatible libSQL/Turso. A heavier project can point the same queries at Postgres. Cache, websockets, and a document engine come after that switch is real.

**Working names:** AltrBase (lab brand) and PolyBase (multi-engine). Pick the public name in the sharpening note.

**Vault stage:** captured (phase 0). This is a core pillar in the catalog. It is not promoted, and it does not change [[../../Altr.lab/stack]] until a `feature_list/` brief says so.

---

## Status in the repo

| Surface | What exists today |
|---------|-------------------|
| `elements/base/src/db` | Turso/libSQL stub. `createTursoClient` throws until `@libsql/client` is wired. |
| `elements/base/src/auth` | Session stub. `getSession` returns null. |
| `elements/base/src/query` | Stub. No Drizzle, no dialect switch. |
| `elements/base` cache | No `cache/` package. |
| API, studio, vectors | No Hono server, dashboard, or AI-agent package. Those samples were removed 2026-10-18 ([[../../tech_space/03-sample-apps-removed]]). A future API, studio app, and vector worker are still the intended homes. |
| `cloud/pocketbase` | Optional PocketBase package. Still the stack doc’s quick admin/auth path. |

---

## Problem

Supabase is capable and tied to a heavy Postgres stack. Self-hosting it means running Kong, GoTrue, PostgREST, Realtime, and Studio, which eats a small server. PocketBase stays light and single-process, and it stops at raw SQLite: no path to enterprise Postgres or a separate cache without leaving the product. A small team wants one backend that starts with zero-config SQLite/Turso, can attach PostgreSQL without rewriting queries, and grows into cache and realtime inside the same API.

## Concept

**AltrBase** is that backend inside this monorepo. Other catalog tracks (Artemis paper ledger, HyperFit entries, PantryYield stock, ForgeRealm inventory) call it. They do not each invent a database.

## Who it is for

You, first, so every altr.lab app shares one client. A second audience is a developer who wants a self-hosted studio and will not run Supabase’s container set. Hosted multi-tenant projects wait until the single-operator path works.

---

## Architecture candidates

These are the catalog’s preferred pieces. They are candidates until the sharpening note locks phase 1. Vendor speed claims (for example Dragonfly versus classic Redis) stay unverified until we measure them here.

| Layer | Candidate | Why it is on the list | Repo today |
|-------|-----------|----------------------|------------|
| API runtime | Hono on Bun | Small process, fast router, typed RPC between client and server | No API package. A new Hono app under `cloud/` is the intended home |
| Embedded / edge SQL | libSQL / Turso | SQLite-compatible, already the monorepo default, local vector later via sqlite-vec | Stub in `@altr/base/db` |
| Heavier SQL | Postgres (`pg`) and PGlite for local WASM/Node | Heavy transactions, JSONB, scale-out. PGlite is a way to run Postgres without a server during dev | Not a dependency. Stack doc: Postgres only when FTS, JSONB, or pgvector SLAs need it |
| Cache | Dragonfly or Valkey (Redis-compatible) | Pub/sub, Artemis live state, game leaderboards | No `cache/` tree |
| Documents (optional) | MongoDB or FerretDB on Postgres | Schemaless sync if a product actually needs it | Stack doc: Mongo only if needed |
| Query layer | Drizzle | Same TypeScript schema; swap the connection between libSQL and Postgres | Not installed |
| Studio | Next.js + Apolyx | Table editor, auth, logs | No studio app in the repo |
| Vectors | A future cloud worker | Ingestion pipeline for copilot-style search | No agent package in the repo |

PocketBase stays the optional quick path in [[../../Altr.lab/stack]] until AltrBase can create a table, a session, and a studio view. This track is the candidate replacement for that path, not a second admin product beside it.

---

## Product phases

| Phase | Name | User-visible outcome | Depends on | Intended packages |
|-------|------|----------------------|------------|-------------------|
| 1 | libSQL that executes | A local libSQL file runs `execute` from `@altr/base/db`. The stub no longer throws | — | `elements/base` |
| 2 | One schema | Drizzle models for one table, queried from Hono. Connection target is libSQL only | Phase 1 | `elements/base`, `cloud/hono-server` |
| 3 | Studio slice | Dashboard lists and edits that one table with Apolyx | Phase 2 | `apps/dashboard` |
| 4 | Sessions | Sign-in creates a session the studio and the API both read. Better Auth is the candidate library | Phase 3 | `elements/base/auth` |
| 5 | Postgres switch | The same Drizzle schema runs against Postgres by changing the connection. PGlite is a candidate for local Postgres | Phase 2 | `elements/base/db` |
| 6 | Realtime | A Hono websocket publishes row changes for that one table | Phases 2 and 3 | `cloud/hono-server` |
| 7 | Cache | A Redis-compatible store (Dragonfly or Valkey) holds pub/sub or a leaderboard key | A product that needs it (Artemis state or ForgeRealm) | new `elements/base` cache module |
| 8 | Documents and vectors | FerretDB/Mongo, or vector ingest in `ai-bot-agent`, only after a track’s sharpening note requires it | A named consumer | `cloud/ai-bot-agent` |

Phases 1–3 are the first build. Phases 5–8 stay deferred so the studio is not blocked on every engine.

## Monetization hypothesis

Open-core self-hosting, then a hosted project tier once phase 4 exists. The studio is the thing someone would pay to avoid operating. Pricing waits until you use phases 1–3 for a real altr.lab table.

## Open questions

1. Public name: AltrBase or PolyBase?
2. First table: a demo `notes` row, or the first real consumer (Artemis paper positions, HyperFit entries)?
3. Is Drizzle required in phase 1, or does raw `@libsql/client` land first and Drizzle in phase 2?
4. Better Auth versus a smaller session cookie you own, given `@altr/base/auth` is still a stub?
5. When does [[../../Altr.lab/stack]] drop PocketBase as the recommended side-project admin?
6. Which cache binary is the phase 7 candidate after a measured comparison, Dragonfly or Valkey?

## When this track is chosen

Add `idea/altr-base/YYYY-MM-DD-sharpen.md` that picks the public name, locks phase 1 to libSQL only, names the one table, and lists non-goals (no Postgres, no cache, no Mongo, no websocket, no multi-tenant hosting). That note is the entrance to `feature_list/altr-base/`. Updating [[../../Altr.lab/stack]] happens with that promotion, not before.
