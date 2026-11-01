---
title: "jord-F0013 — production ops (multi-instance ready)"
feature_id: jord-F0013
description: "Health probes, JSON logs, shared PG rate/idempotency, LISTEN fan-out, JORD_PG_WRITE_CONCURRENCY, OTel, and backup/restore drill landed (S0034–S0040). Remaining: Dockerfile"
created: 2026-10-25
updated: 2026-11-01
tags:
  - feature
  - jord
  - done
  - partial
  - jord-F0013
  - phase-03
  - s0034
  - s0035
  - s0036
  - s0037
  - s0038
  - s0039
  - s0040
---

# jord-F0013 — production ops (multi-instance ready)

> **Status:** partial · **Id:** `jord-F0013` (was P1) · Index: [[../INDEX]] · Hub: [[../README]] · Still open: S0041 on [[../../../plan/Jord/phase-03/README]]

## What shipped in this milestone

- `[[../../../plan/Jord/phase-03/done/S0034-health-probes|S0034]]` — `/health/live` + `/health/ready` — done 2026-10-29
- `[[../../../plan/Jord/phase-03/done/S0035-structured-json-logs|S0035]]` — structured JSON request logs — done 2026-10-29
- `[[../../../plan/Jord/phase-03/done/S0036-shared-rate-limit-idempotency|S0036]]` — shared PG rate limit + idempotency — done 2026-10-29
- `[[../../../plan/Jord/phase-03/done/S0037-listen-seq-fanout|S0037]]` — LISTEN/NOTIFY fan-out + shared watermark — done 2026-10-29
- `[[../../../plan/Jord/phase-03/done/S0038-pg-write-concurrency|S0038]]` — `JORD_PG_WRITE_CONCURRENCY` — done 2026-11-01
- `[[../../../plan/Jord/phase-03/done/S0039-otel-traces|S0039]]` — OpenTelemetry traces + metrics — done 2026-11-01
- `[[../../../plan/Jord/phase-03/done/S0040-backup-restore-drill|S0040]]` — backup + restore drill — done 2026-11-01

## What is still open (not in this card)

- `[[../../../plan/Jord/phase-03/S0041-dockerfile-deploy|S0041]]` — Dockerfile + deploy recipe

## Faithful note

Rate limits, idempotency, realtime seq fan-out, PG write-queue width, and opt-in OTel are multi-instance-ready on Postgres (OTel is process-local export). Backup dumps are SQL/metadata only — blob bytes stay in `data/blobs/` or S3. SQL history is still process-local. Live LISTEN proof needs `JORD_TEST_POSTGRES_URL`; libSQL keeps the single-process bus and serial writes.
