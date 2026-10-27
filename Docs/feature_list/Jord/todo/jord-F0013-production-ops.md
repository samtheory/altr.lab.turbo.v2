---
title: "jord-F0013 — production ops (multi-instance ready)"
feature_id: jord-F0013
description: "Postgres-backed rate-limit/idempotency, LISTEN fan-out, health, OTel, JSON logs, backup drill, Dockerfile, JORD_PG_WRITE_CONCURRENCY"
created: 2026-10-25
updated: 2026-10-27
tags:
  - feature
  - jord
  - todo
  - jord-F0013
  - phase-03
---

# jord-F0013 — production ops (multi-instance ready)

> **Status:** todo · **Id:** `jord-F0013` (was P1) · Index: [[../INDEX]] · Tasks: [[../../../plan/Jord/phase-03/README]]

## Why

Rate limits, idempotency, SQL history, and realtime fan-out are process-local. A second instance breaks them.

## What

Postgres-backed rate-limit + idempotency tables (no Redis). `LISTEN/NOTIFY` seq fan-out (trigger exists; LISTEN deferred from F5). Shared commit watermark. `/health/live` + `/health/ready`. OpenTelemetry. Structured JSON logs. Backup + restore drill. Dockerfile + one deploy recipe. **`JORD_PG_WRITE_CONCURRENCY`** (from phase-02.75 B6).

## Acceptance

Two server instances behind one URL: shared rate limit, cross-instance idempotent replay, SSE on B sees write on A. Restore drill documented with command output.

## Overlap (shipped features to change)

| Id | Note | Change |
|----|------|--------|
| [[../done/jord-F0009-realtime\|jord-F0009]] | realtime | Finish LISTEN side of `pg_notify` |
| [[../done/jord-F0006-apis\|jord-F0006]] | apis (F10) | In-memory rate/idempotency → Postgres-backed |
| [[../done/jord-F0003-writes\|jord-F0003]] | writes | `JORD_PG_WRITE_CONCURRENCY` |
| [[../done/jord-F0002-dialects\|jord-F0002]] | dialects | Multi-instance assumptions |

## Plan tasks (split)

| Task | Status |
|------|--------|
| [[../../../plan/Jord/phase-03/S0034-health-probes\|S0034]] health live/ready | todo |
| [[../../../plan/Jord/phase-03/S0035-structured-json-logs\|S0035]] JSON request logs | todo |
| *(more cards: shared rate-limit, LISTEN, PG concurrency, OTel, backup, Dockerfile)* | not filed |
