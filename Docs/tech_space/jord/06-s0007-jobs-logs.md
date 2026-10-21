---
title: "Jord-S0007 — Studio S5 jobs / logs as-built"
description: "SQL job tables, in-process scheduler, log ring, Studio Runtime panels"
created: 2026-10-21
updated: 2026-10-21
tags:
  - tech-space
  - jord
  - Jord-S0007
  - jord-studio
  - jobs
  - logs
---

# Jord-S0007 — Studio S5 jobs / logs as-built

> Who: mimir / operators after S5. Plan: [[../../plan/Jord/Jord-S0007/README]] · Prior: [[05-s0006-generated-api]] · Intent: [[../../feature_list/Jord/03-jord-studio]].

## Contract

| Piece | Decision |
|-------|----------|
| Schedule | Interval ms (≥ 1000) + enabled |
| Kinds | Built-in: `wal_checkpoint`, `echo`, `records_count` |
| Concurrency | Global single-flight in scheduler |
| Logs | In-memory ring (500); restart clears |
| Manage jobs | **admin** (`canManageJobs`) |

## Engine (`elements/jord`)

| Piece | Role |
|-------|------|
| Tables | `jord_jobs`, `jord_job_runs` (migrate on open) |
| Port | list/get/insert/update/delete job; runs; `listDueJobs` |

## Server (`cloud/jord`)

| Module / route | Role |
|----------------|------|
| `src/jobs/kinds.ts` | Built-in handlers |
| `src/jobs/scheduler.ts` | Tick + run-now; seed disabled WAL job |
| `src/jobs/log-ring.ts` | Append / list |
| `/jobs*` | CRUD + run + runs history |
| `/logs` | Ring dump (`?source=` / `?limit=`) |
| HTTP middleware | Append request summary (no Authorization) |

## Studio

| Piece | Behavior |
|-------|----------|
| Nav **Jobs** / **Logs** | `live` → `/jobs`, `/logs` |
| Jobs panel | Create, enable Switch, Run, Delete, recent runs |
| Logs panel | Poll 5s + source filter |
| BFF | `/api/jobs*`, `/api/logs` |

## Verify (2026-10-21)

- `pnpm --filter @altr/jord test` — 13 passed
- `pnpm --filter @altr/jord-server test` — 18 passed
- Typechecks: jord / jord-server / jord-studio

## Out of this ship

Cron expressions, Redis/Bull, user JS jobs (S6), durable logs, SSE live tail.
