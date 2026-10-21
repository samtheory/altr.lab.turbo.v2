---
title: "Phase 2 — engine jobs schema + port"
description: "Drizzle tables jord_jobs / jord_job_runs; migrate on open; port CRUD helpers"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0007
---

# Phase 2 — engine jobs schema + port

> Who: **sindri** · **saga** (schema / timestamps). Timestamps stay `integer({ mode: 'number' })` ms.

Sprint index: [[README]] · Contract: [[01-runtime-contract]] · Slice 0 schema style: [[../../../tech_space/jord/00-s0001-slice0]]

## Status

**done** (2026-10-21)

## Tables

| Table | Purpose |
|-------|---------|
| `jord_jobs` | Schedule definitions |
| `jord_job_runs` | Execution history (retain last N per job in server logic, e.g. 50) |

Migrate in `ensureRecordsSchema` (or sibling `ensureJobsSchema`) on every `LibSqlAdapter.open` — additive CREATE TABLE IF NOT EXISTS only.

## Port surface (proposed)

```
listJobs() / getJob(id) / insertJob / updateJob / deleteJob
listJobRuns(jobId, limit?) / insertJobRun / finishJobRun
```

Keep handlers thin; scheduler lives in `@altr/jord-server`, not the adapter.

## Tasks

- [ ] Drizzle schema modules + migrate
- [ ] Port methods + LibSqlAdapter impl
- [ ] Unit tests (insert job → list → run row → finish)

## Done when

Temp `file:` DB has both tables; tests round-trip a job and a finished run without HTTP.
