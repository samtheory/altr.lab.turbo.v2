---
title: "jord-F0013 — production ops (multi-instance ready)"
feature_id: jord-F0013
description: "Postgres-backed rate-limit/idempotency + LISTEN fan-out + PG write concurrency shipped; remaining: OTel, backup drill, Dockerfile"
created: 2026-10-25
updated: 2026-11-01
tags:
  - feature
  - jord
  - todo
  - partial
  - jord-F0013
  - phase-03
  - s0039
  - s0040
  - s0041
---

# jord-F0013 — production ops (multi-instance ready)

> **Status:** partial · **Id:** `jord-F0013` (was P1) · Index: [[../INDEX]] · As-shipped: [[../done/jord-F0013-production-ops|jord-F0013]] · Remaining: S0039–S0041 on [[../../../plan/Jord/phase-03/README]]

## Why

Rate limits, idempotency, LISTEN fan-out, and PG write concurrency are shared/ready on Postgres (S0034–S0038). SQL history is still process-local; OTel / backup / Dockerfile remain.

## What

Postgres-backed rate-limit + idempotency tables (no Redis). `LISTEN/NOTIFY` seq fan-out. Shared commit watermark. `/health/live` + `/health/ready`. **`JORD_PG_WRITE_CONCURRENCY`**. OpenTelemetry. Structured JSON logs. Backup + restore drill. Dockerfile + one deploy recipe.

## Acceptance

Two server instances behind one URL: shared rate limit, cross-instance idempotent replay, SSE on B sees write on A. Restore drill documented with command output.

## Overlap (shipped features to change)

| Id | Note | Change |
|----|------|--------|
| [[../done/jord-F0009-realtime\|jord-F0009]] | realtime | Finish LISTEN side of `pg_notify` (**S0037 shipped**) |
| [[../done/jord-F0006-apis\|jord-F0006]] | apis (F10) | In-memory rate/idempotency → Postgres-backed (**S0036 shipped**; libSQL still memory) |
| [[../done/jord-F0003-writes\|jord-F0003]] | writes | `JORD_PG_WRITE_CONCURRENCY` (**S0038 shipped**) |
| [[../done/jord-F0002-dialects\|jord-F0002]] | dialects | Multi-instance assumptions |


## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0034-health-probes\|S0034]] — health live/ready | 45–75 min | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/done/S0035-structured-json-logs\|S0035]] — structured JSON logs | 60–90 min | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/done/S0036-shared-rate-limit-idempotency\|S0036]] — shared rate limit + idempotency | 2–3 h | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/done/S0037-listen-seq-fanout\|S0037]] — LISTEN fan-out + shared watermark | 2–3 h | **done** 2026-10-29 |
| [[../../../plan/Jord/phase-03/done/S0038-pg-write-concurrency\|S0038]] — JORD_PG_WRITE_CONCURRENCY | 45–75 min | **done** 2026-11-01 |
| [[../../../plan/Jord/phase-03/S0039-otel-traces\|S0039]] — OpenTelemetry traces + metrics | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/S0040-backup-restore-drill\|S0040]] — backup + restore drill | 60–90 min | todo |
| [[../../../plan/Jord/phase-03/S0041-dockerfile-deploy\|S0041]] — Dockerfile + deploy recipe | 1.5–2 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
