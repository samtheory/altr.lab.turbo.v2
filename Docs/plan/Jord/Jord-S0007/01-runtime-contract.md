---
title: "Phase 1 — jobs + logs contract"
description: "Job kinds, schedule model, log event shape, roles — lock before code"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0007
  - jobs
  - logs
---

# Phase 1 — jobs + logs contract

> Who: **mimir** (scope) · **heimdall** (roles). Server and Studio implement against this note.

Sprint index: [[README]] · Intent: [[../../../feature_list/Jord/03-jord-studio]] · Auth: [[../../../tech_space/jord/04-s0005-auth]]

## Status

**done** (2026-10-21)

## Jobs (S5)

| Decision | Choice |
|----------|--------|
| Runner home | `@altr/jord-server` in-process (same process as Hono + write queue) |
| Schedule model | **Interval** (`interval_ms` ≥ 1000) + `enabled` boolean — not cron strings in S5 |
| Job kinds | **Built-in registry only** (string `kind` → handler). No eval / user JS |
| Required kinds | `wal_checkpoint` (TRUNCATE), `echo` (lab no-op with message) |
| Optional kind | `records_count` — count rows in a bucket (config JSON) |
| Persistence | SQL tables `jord_jobs` + `jord_job_runs` (names locked in [[02-engine-jobs-schema]]) |
| Concurrency | One job run at a time globally (serialize like write queue, or per-job mutex) — avoid overlapping WAL + heavy work |
| Run-now | `POST /jobs/:id/run` enqueues an immediate run |

### Job row (logical)

| Field | Notes |
|-------|--------|
| `id` | UUID |
| `name` | Display label |
| `kind` | Built-in key |
| `enabled` | Scheduler skips if false |
| `interval_ms` | Tick period |
| `config` | TEXT JSON (kind-specific; `{}` default) |
| `next_run_at` / `last_run_at` | ms integers |
| `last_status` | `ok` \| `error` \| `null` |
| `last_error` | TEXT nullable |

### Job run row (logical)

| Field | Notes |
|-------|--------|
| `id`, `job_id` | UUID FKs |
| `status` | `running` \| `ok` \| `error` |
| `started_at` / `finished_at` | ms |
| `error` | TEXT nullable |
| `result` | TEXT JSON nullable (small) |

## Logs (S5)

| Decision | Choice |
|----------|--------|
| Storage | **In-memory ring** (default capacity 500); process restart clears |
| Sources | HTTP request summary (method/path/status/ms) + job lifecycle |
| API | `GET /logs?limit=` (newest first); auth required |
| Shape | `{ id, at, level, source, message, meta? }` |
| Out of S5 | Durable log table, SSE live tail, log levels UI filters beyond source query |

Do **not** log Authorization headers or full request bodies.

## Roles

| Action | readonly | editor | admin |
|--------|----------|--------|-------|
| List jobs / runs / logs | yes | yes | yes |
| Create / update / enable job | no | no | yes |
| Run-now | no | no | yes |
| Delete job | no | no | yes |

Add `canManageJobs(role)` ≡ `admin` (mirror `canManageApis`).

## HTTP sketch (lock in [[03-server-runner-logs]])

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/jobs` | read |
| `POST` | `/jobs` | manage |
| `GET` | `/jobs/:id` | read |
| `PATCH` | `/jobs/:id` | manage |
| `DELETE` | `/jobs/:id` | manage |
| `POST` | `/jobs/:id/run` | manage |
| `GET` | `/jobs/:id/runs` | read |
| `GET` | `/logs` | read |

## Tasks

- [ ] Lock interval-only schedule (no cron parser)
- [ ] Lock built-in kinds list
- [ ] Lock `canManageJobs` = admin
- [ ] Lock log ring (not SQL) for S5

## Done when

Implementers can build schema + runner + Studio without inventing Redis workers or user-code jobs.
