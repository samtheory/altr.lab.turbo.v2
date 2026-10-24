---
title: "Phase 3 — jord-server runner + log ring"
description: "Interval scheduler, built-in kinds, job HTTP routes, request/job log buffer"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0007
---

# Phase 3 — jord-server runner + log ring

> Who: **sindri**. Heimdall: manage routes + no secret leakage in logs.

Sprint index: [[README]] · Contract: [[01-runtime-contract]]

## Status

**done** (2026-10-21)

## Modules (proposed)

| Module | Role |
|--------|------|
| `src/jobs/kinds.ts` | Built-in handlers (`wal_checkpoint`, `echo`, …) |
| `src/jobs/scheduler.ts` | Tick loop; honor enabled + `next_run_at`; global single-flight |
| `src/jobs/log-ring.ts` | Append / list / capacity |
| Routes in `app.ts` | `/jobs*`, `/logs` behind auth |

## Scheduler rules

- Start with `startJordServer`; stop on shutdown (same path as WAL hygiene)
- Tick every ~1s (or min interval); due jobs with `enabled` run via single-flight
- After run: update job last_* fields; set `next_run_at = now + interval_ms`
- Job body uses `enqueueWrite` when touching DB (WAL checkpoint / counts)

## Logging

- Middleware: after each protected (and health?) request, append `{ source: "http", … }`
- Job start/finish/error → `{ source: "job", … }`
- Strip Authorization; truncate paths/messages

## Seed

On first boot with zero jobs, optionally seed one disabled `wal_checkpoint` job (interval 5m) so Studio is not empty — document in as-built.

## Tasks

- [ ] Kind registry + scheduler + tests (fake clock or short interval)
- [ ] HTTP routes + role guards
- [ ] Log ring + `GET /logs`
- [ ] Wire start/stop into `index.ts` lifecycle

## Done when

With `dev:jord` up, admin can create an `echo` job, run-now succeeds, run history shows `ok`, and `/logs` includes http + job events.
