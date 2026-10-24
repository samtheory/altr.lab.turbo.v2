---
title: "Jord — jobs and logs"
description: "Interval jobs in SQL, in-process scheduler, and an in-memory log ring"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - jobs
  - logs
---

# Jord — jobs and logs

> Who: anyone scheduling work inside jord-server. Auth: [[../auth/README]].

## Why

Maintenance (WAL checkpoint) and small probes should run in the same process as the write queue, visible in Studio, without Redis or a second worker.

## What

Tables `jord_jobs` and `jord_job_runs` migrate on open. A job has an interval of at least 1000 ms and an enabled flag. Built-in kinds: `wal_checkpoint`, `echo`, `records_count`. The scheduler is single-flight. Manage (create, enable, delete, run-now) is **admin**.

Logs are an in-memory ring of 500 lines. Restart clears it. HTTP middleware appends a request summary and strips `Authorization`. Sources include `request` and `trigger`. `GET /logs?source=&limit=` dumps the ring.

Boot seeds a **disabled** WAL checkpoint job so file installs can turn it on without inventing SQL.

## How

| Piece | Path |
|-------|------|
| Kinds | `cloud/jord/src/jobs/kinds.ts` |
| Tick | `cloud/jord/src/jobs/scheduler.ts` |
| Ring | `cloud/jord/src/jobs/log-ring.ts` |
| Studio | `/jobs`, `/logs` (logs poll about every 5s) |

## Example

Admin creates `{ "kind": "records_count", "interval_ms": 60000, "enabled": true }`. The next tick writes a `jord_job_runs` row and a log line. Studio **Logs** with source filter shows it until the process restarts.

## Not in Jord yet

Cron expressions, durable log storage, user JavaScript jobs, a live SSE tail of the ring.
