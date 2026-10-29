---
title: "jord-F0013 — production ops (multi-instance ready)"
feature_id: jord-F0013
description: "Postgres-backed rate-limit/idempotency + LISTEN fan-out shipped; remaining: PG concurrency, OTel, backup drill, Dockerfile"
created: 2026-10-25
updated: 2026-10-29
tags:
  - feature
  - jord
  - todo
  - partial
  - jord-F0013
  - phase-03
  - s0038
  - s0039
  - s0040
  - s0041
---

# jord-F0013 — production ops (multi-instance ready)

> **Status:** partial · **Id:** `jord-F0013` (was P1) · Index: [[../INDEX]] · As-shipped: [[../done/jord-F0013-production-ops|jord-F0013]] · Remaining: S0038–S0041 on [[../../../plan/Jord/phase-03/README]]

## Why

Rate limits, idempotency, and realtime LISTEN fan-out are shared on Postgres (S0034–S0037). SQL history is still process-local; PG write concurrency / OTel / backup / Dockerfile remain.

## What

Postgres-backed rate-limit + idempotency tables (no Redis). `LISTEN/NOTIFY` seq fan-out (trigger exists; LISTEN deferred from F5). Shared commit watermark. `/health/live` + `/health/ready`. OpenTelemetry. Structured JSON logs. Backup + restore drill. Dockerfile + one deploy recipe. **`JORD_PG_WRITE_CONCURRENCY`** (from phase-02.75 B6).

## Acceptance

Two server instances behind one URL: shared rate limit, cross-instance idempotent replay, SSE on B sees write on A. Restore drill documented with command output.

## Overlap (shipped features to change)

| Id | Note | Change |
|----|------|--------|
| [[../done/jord-F0009-realtime\|jord-F0009]] | realtime | Finish LISTEN side of `pg_notify` |
| [[../done/jord-F0006-apis\|jord-F0006]] | apis (F10) | In-memory rate/idempotency → Postgres-backed (**S0036 shipped**; libSQL still memory) |
| [[../done/jord-F0003-writes\|jord-F0003]] | writes | `JORD_PG_WRITE_CONCURRENCY` |
| [[../done/jord-F0002-dialects\|jord-F0002]] | dialects | Multi-instance assumptions |


## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/S0034-health-probes\|S0034]] — health live/ready | 45–75 min | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/S0035-structured-json-logs\|S0035]] — structured JSON logs | 60–90 min | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/S0036-shared-rate-limit-idempotency\|S0036]] — shared rate limit + idempotency | 2–3 h | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/S0037-listen-seq-fanout\|S0037]] — LISTEN fan-out + shared watermark | 2–3 h | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/S0038-pg-write-concurrency\|S0038]] — JORD_PG_WRITE_CONCURRENCY | 45–75 min | todo |
| [[../../../plan/Jord/phase-03/S0039-otel-traces\|S0039]] — OpenTelemetry traces + metrics | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/S0040-backup-restore-drill\|S0040]] — backup + restore drill | 60–90 min | todo |
| [[../../../plan/Jord/phase-03/S0041-dockerfile-deploy\|S0041]] — Dockerfile + deploy recipe | 1.5–2 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
