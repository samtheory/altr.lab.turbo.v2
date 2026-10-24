---
title: "Jord — later slices"
description: "After Slice 0: hosted libSQL, PostgresAdapter, vectors, CDC realtime, blob storage, Studio phases"
created: 2026-10-18
updated: 2026-10-24
tags:
  - feature
  - jord
  - database
  - Jord-S0004
  - Jord-S0005
  - Jord-S0006
  - Jord-S0007
  - Jord-S0009
  - Jord-S0013
  - Jord-S0014
---

# Jord — later slices

> After [[00-intent]]. Architecture (ports, concurrency): [[02-architecture]]. Studio: [[03-jord-studio]]. Studio S7 as-built: [[../../tech_space/jord/08-s0009-triggers-policies]].

None of the engine rows below were Slice 0. Default store is still one `file:` database + one Hono process; **PostgresAdapter** shipped in Jord-S0010. Studio S1–S8 are shipped.

## Engine slices

| Slice | Outcome | Starts when |
|-------|---------|-------------|
| Hosted libSQL | `DATABASE_URL=libsql://…` activates `LibSqlAdapter` (same port) — **shipped** [[../../tech_space/jord/18-s0019-hosted-libsql]] | Done |
| Artemis agent scratchpad | Writer uses bucket `artemis` on `records` via `@altr/jord-server` batching (not typed `orders` / `positions`) | The bot has a scratchpad payload shape |
| In-process vector pipelines | Embedded semantic memory on the Jord process; `searchVectors` + lab cosine — **shipped** [[../../tech_space/jord/13-s0014-vectors]] (sqlite-vec/pgvector hard path later) | Bot retrieval / Studio S11 |
| PostgresAdapter | Scheme `postgres://` / `postgresql://` — **core CRUD shipped** ([[../../tech_space/jord/09-s0010-postgres]]); native RLS **shipped** ([[../../tech_space/jord/16-s0017-postgres-rls]]); `pgvector` still later | Optional hard vectors |
| Cache | One Redis-compatible store, measured choice | Live state or leaderboards exist |
| Bot process | Second cloud package only if the Jord server should not run the model | In-process writer is the wrong shape |

## Supabase-parity pillars (roadmap)

These are first-class later pillars, not Slice 0 packages.

| Pillar | Outcome | Home |
|--------|---------|------|
| **Realtime (CDC)** | Write-path emit + SSE + WebSockets — **shipped** [[../../tech_space/jord/17-s0018-realtime-ws]] (true SQLite hooks / LISTEN still later) | Server + Studio live views |
| **Local blob storage** | Lightweight asset / file buckets (S3-shaped REST + local disk; full S3 later) — **shipped** [[../../tech_space/jord/12-s0013-blobs]] | `@altr/jord-server` (+ Studio browser) |
| **In-process vector pipelines** | Semantic memory via `searchVectors` on `JordDriverPort` — **shipped** [[../../tech_space/jord/13-s0014-vectors]] | `@altr/jord` + server; hard sqlite-vec / `pgvector` later |

## Jord Studio slices

Detail: [[03-jord-studio]].

| Slice | Outcome |
|-------|---------|
| Studio S1 | `apps/jord-studio` lists `records` — **done** [[../../plan/Jord/Jord-S0002/README|Jord-S0002]] |
| Studio S1.5 | Side nav + table-editor UX — **done** [[../../plan/Jord/Jord-S0003/README|Jord-S0003]] |
| Studio S2 | Schema visualizer + additive live save — **done** [[../../plan/Jord/Jord-S0004/README|Jord-S0004]] |
| Studio S3 | Auth + feature roles — **done** [[../../plan/Jord/Jord-S0005/README|Jord-S0005]] · [[../../tech_space/jord/04-s0005-auth]] |
| Studio S4 | Generated CRUD API panel — **done** [[../../plan/Jord/Jord-S0006/README|Jord-S0006]] · [[../../tech_space/jord/05-s0006-generated-api]] |
| Studio S5 | Jobs / cron + logs — **done** [[../../plan/Jord/Jord-S0007/README|Jord-S0007]] · [[../../tech_space/jord/06-s0007-jobs-logs]] |
| Studio S6 | Custom APIs + function APIs — **done** [[../../plan/Jord/Jord-S0008/README|Jord-S0008]] · [[../../tech_space/jord/07-s0008-custom-function-apis]] |
| Studio S7 | Triggers, policies (libSQL middleware; Postgres RLS compile deferred to S8) — **done** [[../../plan/Jord/Jord-S0009/README|Jord-S0009]] · [[../../tech_space/jord/08-s0009-triggers-policies]] |
| Studio S8 | Postgres connection (`PostgresAdapter`) — **done** [[../../plan/Jord/Jord-S0010/README|Jord-S0010]] · [[../../tech_space/jord/09-s0010-postgres]] |
| Studio S9 | Realtime subscriptions UI (CDC-equivalent + SSE) — **done** [[../../plan/Jord/Jord-S0011/README|Jord-S0011]] · [[../../tech_space/jord/10-s0011-realtime]] |
| Studio S9.5 | Multi-table browse + CREATE TABLE — **done** [[../../plan/Jord/Jord-S0012/README|Jord-S0012]] · [[../../tech_space/jord/11-s0012-multi-table]] |
| Studio S10 | Blob buckets browser — **done** [[../../plan/Jord/Jord-S0013/README|Jord-S0013]] · [[../../tech_space/jord/12-s0013-blobs]] |
| Studio S11 | Vector / embedding ops surfaced in Studio — **done** [[../../plan/Jord/Jord-S0014/README|Jord-S0014]] · [[../../tech_space/jord/13-s0014-vectors]] |

The first Studio plan opens only after Slice 0 acceptance is true.
