---
title: "Jord-S0001 — libSQL file and one server"
description: "Closed lab implement track. LibSqlAdapter, records OCC, WAL checkpoints, snapshot, and jord-server shipped 2026-10-21."
created: 2026-10-18
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0001
  - sprint
---

# Jord-S0001 — libSQL file and one server

> Who: **mimir** (or specialists). **Status: done** (2026-10-21). As-built: [[../../../../tech_space/jord/overview]]. Contract: [[../../../../feature_list/Jord/done/jord-F0001-overview]]. Architecture: [[../../../../feature_list/Jord/done/jord-F0002-dialects]]. Decisions: [[../../../../idea/Jord/2026-10-18-sharpen]]. Roadmap: [[../../../00-roadmap-apolyx-jord-artemis]]. Agent: [[../../../../agents/mimir/00-index]].

**Sprint id:** `Jord-S0001`  
**Opened:** 2026-10-18 · **Ready:** 2026-10-18 · **Active:** 2026-10-21 · **Closed:** 2026-10-21 · **Owner:** mimir  
**Do not start Jord Studio, Postgres, Redis, Mongo, or sqlite-vec in this sprint.**

## Goal

Boot one gitignored libSQL file, one library, and one Hono server. A caller can insert a `records` row and read it back. Concurrent updates collide on `version` (409). The server checkpoints the WAL on a timer and on shutdown.

## Phases

Run in order. A later card may assume the files from the earlier ones.

| # | Card | Delivers |
|---|------|----------|
| 1 | [[01-packages]] | `elements/jord`, `cloud/jord`, workspace scripts, deps |
| 2 | [[02-driver]] | `JordDriverPort`, `LibSqlAdapter`, mkdir, pragmas, `file:` only |
| 3 | [[03-schema]] | `records` columns, 64-bit timestamps, `version`, index |
| 4 | [[04-occ]] | Insert at version 1; update matches version or returns conflict |
| 5 | [[05-snapshot]] | `pnpm db:snapshot`, `data/*.db` gitignored |
| 6 | [[06-server]] | Routes, serial write queue, WAL truncate checkpoint |
| 7 | [[07-base-db]] | `@altr/base/db` stops being a live Turso client |
| 8 | [[08-verify]] | Acceptance commands. Then docs_man writes `tech_space` |

## Plan-level decisions

Locked here so implementation does not reopen them. The feature contract stays in [[../../../../feature_list/Jord/done/jord-F0001-overview]].

1. **Node 20+, not a Bun install gate.** Repo `engines.node` is `>=20`. `@altr/jord-server` is Hono on `@hono/node-server`. Do not use Bun-only APIs. [[../../../../Altr.lab/stack]] still names Hono; Bun is not required to finish this sprint.
2. **Deps stay inside the new packages.** Runtime: `drizzle-orm`, `@libsql/client` in `@altr/jord`; `hono`, `@hono/node-server` in `@altr/jord-server`. No `postgres`, `drizzle-orm/pg`, Redis, Mongo, or `sqlite-vec` packages.
3. **Schema applies on open.** `createJordClient` creates `data/` and runs idempotent `CREATE TABLE` / `CREATE INDEX`. No drizzle-kit migration folder in this sprint.
4. **Ids are UUID strings** from `crypto.randomUUID()`. No cuid2 package.
5. **Timestamps** are Drizzle `integer({ mode: 'number' })` (millisecond Unix time). Not a 32-bit integer mode.
6. **OCC is SQL, not a process lock.** `UPDATE … SET version = version + 1 WHERE id = ? AND version = ?`. Zero rows → conflict. The HTTP layer maps that to **409**.
7. **One writer queue inside the server.** HTTP writes run one-at-a-time in that process. No second daemon. Snapshot and a single-process `createJordClient` may open the file directly.
8. **WAL checkpoint interval is 60s** unless `JORD_WAL_CHECKPOINT_MS` overrides it. Shutdown (`SIGINT`, `SIGTERM`) always runs `PRAGMA wal_checkpoint(TRUNCATE)` before exit.
9. **`@altr/base` is not the client.** Card 7 removes the live Turso stub path. Callers use `@altr/jord`.

## Definition of done

- [x] Every card's "Done when" holds
- [x] [[../../../../feature_list/Jord/done/jord-F0001-overview]] acceptance is true
- [x] `pnpm --filter @altr/jord test` and `pnpm --filter @altr/jord typecheck` pass
- [x] `pnpm --filter @altr/jord-server typecheck` passes
- [x] A `tech_space` note exists only after the code is in the tree (card 8, docs_man) → [[../../../../tech_space/jord/overview]]

## Links

- Track: [[../README]]
- Intent: [[../../../../feature_list/Jord/done/jord-F0001-overview]]
- Architecture: [[../../../../feature_list/Jord/done/jord-F0002-dialects]]
- Later (do not build): [[../../../../feature_list/Jord/INDEX]] · [[../../../../feature_list/Jord/done/jord-F0012-studio]]
