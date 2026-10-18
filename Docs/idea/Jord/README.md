---
title: "Jord — idea track"
description: "R&D folder for Jord, the in-repo libSQL engine. Jord Studio is the later admin app. Name locked 2026-10-18."
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - jord
  - baas
  - readme
---

# Jord

> Open this to grow the shared backend. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]]. Current stack decision: [[../../Altr.lab/stack]].

**Category:** developer tools and infrastructure.

**Positioning:** a self-hosted, lightweight alternative to Supabase. One API and one query layer. Dev and edge run on SQLite-compatible libSQL/Turso. A heavier project can point the same queries at Postgres. Cache, websockets, and a document engine come after that switch is real.

**Name, locked 2026-10-18:** **Jord**. The later admin app is **Jord Studio**. The naming record is [[2026-10-18-sharpen]].

**Vault stage:** intent [[../../feature_list/Jord/00-intent]] · architecture [[../../feature_list/Jord/02-architecture]] · Studio [[../../feature_list/Jord/03-jord-studio]]. Plan [[../../plan/Jord/Jord-S0001/README]] opened, not started. Code packages not created yet.

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

This engine is that backend inside this monorepo. Other catalog tracks (Artemis paper ledger, HyperFit entries, PantryYield stock, ForgeRealm inventory) call it. They do not each invent a database. The Artemis bot uses the same file later, under the `artemis` bucket.

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

PocketBase stays the optional quick path in [[../../Altr.lab/stack]] until Jord can create a table, a session, and Jord Studio. Jord is the candidate replacement for that path.

---

## Product phases

The ladder below is the original candidate map. The first slice is [[../../feature_list/Jord/00-intent]] (file + one server, no Jord Studio). Everything past that is [[../../feature_list/Jord/01-later]].

| Phase | Name | User-visible outcome | Depends on | Intended packages |
|-------|------|----------------------|------------|-------------------|
| 1 | libSQL that executes | A local libSQL file runs `execute` from `@altr/base/db`. The stub no longer throws | — | `elements/base` |
| 2 | One schema | Drizzle models for one table, queried from Hono. Connection target is libSQL only | Phase 1 | `elements/jord`, `cloud/jord` |
| 3 | Jord Studio S1 | App lists and edits that one table with Apolyx | Phase 2 | `apps/jord-studio` — [[../../feature_list/Jord/03-jord-studio]] |
| 4 | Sessions | Sign-in the studio and the API both read | Phase 3 | auth in Jord / Studio |
| 5 | Postgres switch | Same Drizzle table schema, second driver | Phase 2 | `@altr/jord` — [[../../feature_list/Jord/02-architecture]] |
| 6 | Realtime | Hono websocket for row changes | Phases 2 and 3 | `cloud/jord` |
| 7 | Cache | Redis-compatible store when a product needs it | A named consumer | later module |
| 8 | Documents and vectors | Dialect adapters / optional bot process | A named consumer | later |

Phases 1–3 are the first build. Phases 5–8 stay deferred so the studio is not blocked on every engine.

## Monetization hypothesis

Open-core self-hosting, then a hosted project tier once phase 4 exists. The studio is the thing someone would pay to avoid operating. Pricing waits until you use phases 1–3 for a real altr.lab table.

## Decided

[[2026-10-18-sharpen]] answers the early questions. Intent: [[../../feature_list/Jord/00-intent]]. Layout and dialects: [[../../feature_list/Jord/02-architecture]]. Studio surfaces: [[../../feature_list/Jord/03-jord-studio]]. Slice order: [[../../feature_list/Jord/01-later]]. Plan: [[../../plan/Jord/Jord-S0001/README]].

**Placement:** file `data/jord.db` · library `elements/jord` · server `cloud/jord` · Studio `apps/jord-studio` (later). Modular packages; one product; split deployables later if needed.
