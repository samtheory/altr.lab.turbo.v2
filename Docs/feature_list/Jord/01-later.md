---
title: "Jord — later slices"
description: "After Slice 0: hosted libSQL, PostgresAdapter, vectors, CDC realtime, blob storage, Studio phases"
created: 2026-10-18
updated: 2026-10-21
tags:
  - feature
  - jord
  - database
  - Jord-S0004
  - Jord-S0005
---

# Jord — later slices

> After [[00-intent]]. Architecture (ports, concurrency): [[02-architecture]]. Studio: [[03-jord-studio]]. Studio S3 as-built: [[../../tech_space/jord/04-s0005-auth]].

None of the engine rows below are Slice 0. Slice 0 is one `file:` database, `LibSqlAdapter` only, and one Hono process. Studio S1–S3 are shipped.

## Engine slices

| Slice | Outcome | Starts when |
|-------|---------|-------------|
| Hosted libSQL | `DATABASE_URL=libsql://…` activates `LibSqlAdapter` (same port) | The file should leave one laptop |
| Artemis agent scratchpad | Writer uses bucket `artemis` on `records` via `@altr/jord-server` batching (not typed `orders` / `positions`) | The bot has a scratchpad payload shape |
| In-process vector pipelines | Embedded semantic memory on the Jord process; `searchVectors` → `sqlite-vec` | Bot retrieval needs search |
| PostgresAdapter | Scheme `postgres://` / `postgresql://` selects the reserved adapter: pooling, MVCC writes, `pgvector` | A product needs Postgres concurrency or plugins |
| Cache | One Redis-compatible store, measured choice | Live state or leaderboards exist |
| Bot process | Second cloud package only if the Jord server should not run the model | In-process writer is the wrong shape |

## Supabase-parity pillars (roadmap)

These are first-class later pillars, not Slice 0 packages.

| Pillar | Outcome | Home |
|--------|---------|------|
| **Realtime (CDC)** | Change Data Capture from SQLite hooks (libSQL) or equivalent; push via SSE and/or WebSockets on `@altr/jord-server` | Server + Studio live views |
| **Local blob storage** | Lightweight asset / file buckets (S3-compatible API or a simple static file server behind Jord) | `@altr/jord-server` (+ Studio browser) |
| **In-process vector pipelines** | Semantic memory pipelines using `sqlite-vec` through `searchVectors` on `JordDriverPort` | `@altr/jord` + server; Postgres maps to `pgvector` later |

## Jord Studio slices

Detail: [[03-jord-studio]].

| Slice | Outcome |
|-------|---------|
| Studio S1 | `apps/jord-studio` lists `records` — **done** [[../../plan/Jord/Jord-S0002/README|Jord-S0002]] |
| Studio S1.5 | Side nav + table-editor UX — **done** [[../../plan/Jord/Jord-S0003/README|Jord-S0003]] |
| Studio S2 | Schema visualizer + additive live save — **done** [[../../plan/Jord/Jord-S0004/README|Jord-S0004]] |
| Studio S3 | Auth + feature roles — **done** [[../../plan/Jord/Jord-S0005/README|Jord-S0005]] · [[../../tech_space/jord/04-s0005-auth]] |
| Studio S4 | Generated CRUD API panel |
| Studio S5 | Jobs / cron + logs |
| Studio S6 | Custom APIs + function APIs |
| Studio S7 | Triggers, policies (libSQL middleware / Postgres RLS compile) |
| Studio S8 | Postgres connection in Studio (`PostgresAdapter`) |
| Studio S9 | Realtime subscriptions UI (CDC / SSE / WS) |
| Studio S10 | Blob buckets browser |
| Studio S11 | Vector / embedding ops surfaced in Studio |

The first Studio plan opens only after Slice 0 acceptance is true.
