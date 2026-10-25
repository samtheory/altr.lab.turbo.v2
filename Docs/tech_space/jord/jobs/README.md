---
title: "Jord — jobs and logs"
description: "Interval jobs in SQL, in-process scheduler, batched jord_logs, outbox prune, blob GC"
created: 2026-10-24
updated: 2026-10-25
tags:
  - tech-space
  - jord
  - jobs
  - logs
---

# Jord — jobs and logs

> Who: anyone scheduling work inside jord-server. Auth: [[../auth/README]]. Blobs GC: [[../blobs/README]].

## Why

Maintenance (WAL checkpoint, outbox prune, pending blob GC) and small probes should run in the same process as the write queue, visible in Studio, without Redis or a second worker.

## What

Tables `jord_jobs` and `jord_job_runs` migrate on open. A job has an interval of at least 1000 ms and an enabled flag. Built-in kinds: `wal_checkpoint`, `echo`, `records_count`, `changes_prune`, **`blobs_gc`**. The scheduler is single-flight. Manage (create, enable, delete, run-now) is **admin**.

Logs: S0024 persists batched, redacted rows to `jord_logs` (see [[../studio/README]]). The in-memory ring may still be used for ephemeral request lines.

Boot seeds a **disabled** WAL checkpoint job, an enabled **outbox prune**, and an enabled **blob pending GC** when missing.

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
